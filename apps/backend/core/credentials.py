import base64
import ctypes
import ctypes.wintypes
import hashlib
import hmac
import json
import logging
import os
import platform
from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class CredentialCategory(str, Enum):
    SSH = "SSH"
    SIP_SUBSCRIBER = "SIP_SUBSCRIBER"
    OXE_MANAGEMENT = "OXE_MANAGEMENT"


class VaultProfileMismatchError(RuntimeError):
    """Raised when DPAPI encrypted secrets cannot be decrypted because user profile or machine changed."""
    pass


class DATA_BLOB(ctypes.Structure):
    _fields_ = [
        ("cbData", ctypes.wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_char)),
    ]


class ICredentialProvider(ABC):
    """Formal interface for credential storage providers."""

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is functional in the current environment."""
        pass

    @abstractmethod
    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext and return base64-encoded ciphertext."""
        pass

    @abstractmethod
    def decrypt(self, ciphertext: str) -> str:
        """Decrypt ciphertext and return plaintext."""
        pass


class WindowsDPAPIProvider(ICredentialProvider):
    """
    Windows Data Protection API (DPAPI) Provider.
    Cryptographically binds secret encryption to the active Windows user profile and machine keyring.
    Invariants:
    - Never stores master keys in user space files.
    - Decryption is only possible by the same Windows user on the same machine.
    """

    def is_available(self) -> bool:
        return platform.system() == "Windows" and hasattr(ctypes, "windll")

    def encrypt(self, plaintext: str) -> str:
        if not self.is_available():
            raise RuntimeError("Windows DPAPI is only available on Windows host environments.")

        data_bytes = plaintext.encode("utf-8")
        blob_in = DATA_BLOB(len(data_bytes), ctypes.create_string_buffer(data_bytes, len(data_bytes)))
        blob_out = DATA_BLOB()

        ret = ctypes.windll.crypt32.CryptProtectData(
            ctypes.byref(blob_in),
            ctypes.c_wchar_p("OXE_SIP_VAULT"),
            None,
            None,
            None,
            0,
            ctypes.byref(blob_out),
        )
        if not ret:
            raise RuntimeError("DPAPI CryptProtectData operation failed.")

        encrypted_bytes = ctypes.string_at(blob_out.pbData, blob_out.cbData)
        ctypes.windll.kernel32.LocalFree(blob_out.pbData)
        return base64.b64encode(encrypted_bytes).decode("ascii")

    def decrypt(self, ciphertext: str) -> str:
        if not self.is_available():
            raise RuntimeError("Windows DPAPI is only available on Windows host environments.")

        raw_bytes = base64.b64decode(ciphertext.encode("ascii"))
        blob_in = DATA_BLOB(len(raw_bytes), ctypes.create_string_buffer(raw_bytes, len(raw_bytes)))
        blob_out = DATA_BLOB()

        ret = ctypes.windll.crypt32.CryptUnprotectData(
            ctypes.byref(blob_in),
            None,
            None,
            None,
            None,
            0,
            ctypes.byref(blob_out),
        )
        if not ret:
            raise VaultProfileMismatchError(
                "Windows DPAPI CryptUnprotectData failed. The secret was encrypted under a different "
                "Windows user profile or machine. Please re-enter the credentials."
            )

        decrypted_bytes = ctypes.string_at(blob_out.pbData, blob_out.cbData)
        ctypes.windll.kernel32.LocalFree(blob_out.pbData)
        return decrypted_bytes.decode("utf-8")


class PortableFileProvider(ICredentialProvider):
    """
    Authenticated Portable File Provider (PBKDF2-HMAC-SHA256 Encrypt-then-MAC).
    Provides fallback encrypted storage when platform DPAPI is unavailable.
    """

    def __init__(self, key_path: Path):
        self.key_path = key_path
        self._master_key = self._load_or_create_key()

    def is_available(self) -> bool:
        return True

    def _load_or_create_key(self) -> bytes:
        self.key_path.parent.mkdir(parents=True, exist_ok=True)
        if self.key_path.exists():
            try:
                with open(self.key_path, "rb") as f:
                    return f.read().strip()
            except Exception as e:
                logger.warning(f"Failed to read vault key: {e}. Generating new key.")

        new_key = os.urandom(32)
        try:
            with open(self.key_path, "wb") as f:
                f.write(new_key)
            if hasattr(os, "chmod"):
                try:
                    os.chmod(self.key_path, 0o600)
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Could not persist vault key to disk: {e}")
        return new_key

    def encrypt(self, plaintext: str) -> str:
        data = plaintext.encode("utf-8")
        salt = os.urandom(16)
        enc_key = hashlib.pbkdf2_hmac("sha256", self._master_key, salt, 10000, dklen=32)
        mac_key = hashlib.pbkdf2_hmac("sha256", self._master_key, salt + b"mac", 10000, dklen=32)

        keystream = bytearray()
        counter = 0
        while len(keystream) < len(data):
            block = hmac.new(enc_key, salt + counter.to_bytes(4, "big"), hashlib.sha256).digest()
            keystream.extend(block)
            counter += 1

        ciphertext = bytes(a ^ b for a, b in zip(data, keystream[: len(data)]))
        tag = hmac.new(mac_key, salt + ciphertext, hashlib.sha256).digest()
        payload = salt + tag + ciphertext
        return base64.b64encode(payload).decode("ascii")

    def decrypt(self, encoded: str) -> str:
        payload = base64.b64decode(encoded.encode("ascii"))
        if len(payload) < 48:
            raise ValueError("Corrupt ciphertext payload: insufficient length")

        salt = payload[:16]
        tag = payload[16:48]
        ciphertext = payload[48:]

        enc_key = hashlib.pbkdf2_hmac("sha256", self._master_key, salt, 10000, dklen=32)
        mac_key = hashlib.pbkdf2_hmac("sha256", self._master_key, salt + b"mac", 10000, dklen=32)

        expected_tag = hmac.new(mac_key, salt + ciphertext, hashlib.sha256).digest()
        if not hmac.compare_digest(tag, expected_tag):
            raise ValueError("Integrity check failed: secret authentication tag mismatch")

        keystream = bytearray()
        counter = 0
        while len(keystream) < len(ciphertext):
            block = hmac.new(enc_key, salt + counter.to_bytes(4, "big"), hashlib.sha256).digest()
            keystream.extend(block)
            counter += 1

        plaintext_bytes = bytes(a ^ b for a, b in zip(ciphertext, keystream[: len(ciphertext)]))
        return plaintext_bytes.decode("utf-8")


# Compatibility alias
WindowsDPAPI = WindowsDPAPIProvider()


class CredentialVault:
    """
    Secure Credential Vault:
    - Never stores plaintext credentials in SQLite or plaintext config files.
    - Uses OS DPAPI on Windows with authenticated fallback.
    - Automatically masks secrets in UI responses and strips them from logs and reports.
    """

    def __init__(self, vault_dir: Path | None = None):
        self.vault_dir = vault_dir or Path("config/vault")
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.store_file = self.vault_dir / "secrets.enc"
        self._dpapi_provider = WindowsDPAPIProvider()
        self._fallback_provider = PortableFileProvider(self.vault_dir / ".vault_key")
        self._known_secrets: set[str] = set()

    def _encrypt(self, secret: str) -> str:
        if self._dpapi_provider.is_available():
            try:
                return "dpapi:" + self._dpapi_provider.encrypt(secret)
            except Exception as e:
                logger.warning(f"DPAPI encryption failed, falling back to authenticated file provider: {e}")
        return "keystream:" + self._fallback_provider.encrypt(secret)

    def _decrypt(self, payload: str) -> str:
        if payload.startswith("dpapi:"):
            return self._dpapi_provider.decrypt(payload[6:])
        if payload.startswith("keystream:"):
            return self._fallback_provider.decrypt(payload[10:])
        if payload.startswith("vault:"):
            return self._fallback_provider.decrypt(payload[6:])
        raise ValueError(f"Unknown vault payload prefix in {payload[:15]}")

    def _load_store(self) -> dict[str, str]:
        if not self.store_file.exists():
            return {}
        try:
            with open(self.store_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_store(self, data: dict[str, str]):
        with open(self.store_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        if hasattr(os, "chmod"):
            try:
                os.chmod(self.store_file, 0o600)
            except Exception:
                pass

    def store_secret(self, category: CredentialCategory, entity_id: str, secret_value: str | None) -> None:
        """Securely store an encrypted secret for a runtime or configuration."""
        if not secret_value:
            self.delete_secret(category, entity_id)
            return

        key = f"{category.value}:{entity_id}"
        store = self._load_store()
        store[key] = self._encrypt(secret_value)
        self._save_store(store)
        self._known_secrets.add(secret_value)

    def retrieve_secret(self, category: CredentialCategory, entity_id: str) -> Optional[str]:
        """Decrypt and retrieve secret value for active operations."""
        key = f"{category.value}:{entity_id}"
        store = self._load_store()
        encrypted = store.get(key)
        if not encrypted:
            return None
        try:
            val = self._decrypt(encrypted)
            self._known_secrets.add(val)
            return val
        except Exception as e:
            logger.error(f"Failed to decrypt secret {key}: {e}")
            return None

    def delete_secret(self, category: CredentialCategory, entity_id: str) -> bool:
        """Remove a secret from the vault."""
        key = f"{category.value}:{entity_id}"
        store = self._load_store()
        if key in store:
            del store[key]
            self._save_store(store)
            return True
        return False

    def has_secret(self, category: CredentialCategory, entity_id: str) -> bool:
        key = f"{category.value}:{entity_id}"
        store = self._load_store()
        return key in store

    @staticmethod
    def mask_secret(secret: str | None) -> str | None:
        """Return a safe masked placeholder string."""
        if not secret:
            return None
        return "********"

    def sanitize_text(self, text: str) -> str:
        """Strip and scrub all known secrets from logs, diagnostics, or exported reports."""
        if not text:
            return text
        sanitized = text
        for secret in self._known_secrets:
            if secret and len(secret) > 3:
                sanitized = sanitized.replace(secret, "[REDACTED_SECRET]")
        return sanitized


# Global vault singleton instance
credential_vault = CredentialVault()

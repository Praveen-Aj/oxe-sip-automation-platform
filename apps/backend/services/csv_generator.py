import os
import re
import tempfile
from pathlib import Path

from apps.backend.core.credentials import credential_vault
from shared.schemas.configuration import CSVPreviewResponse


class CSVGeneratorService:
    def __init__(self, temp_dir_root: Path | None = None):
        if temp_dir_root:
            self.temp_dir_root = Path(temp_dir_root)
            self.temp_dir_root.mkdir(parents=True, exist_ok=True)
        else:
            self.temp_dir_root = Path(tempfile.gettempdir()) / "sipp_generated_csvs"
            self.temp_dir_root.mkdir(parents=True, exist_ok=True)

    def generate_caller_call_csv(
        self,
        caller_start: int,
        caller_end: int,
        called_start: int,
        called_end: int,
        oxe_ip: str,
        oxe_port: int = 5060,
        auth_enabled: bool = False,
        auth_password: str | None = None,
        prefix_tag: str = "run"
    ) -> tuple[Path, CSVPreviewResponse]:
        """Generate caller call CSV with delimiter ';'."""
        self._validate_range(caller_start, caller_end, "caller")
        self._validate_range(called_start, called_end, "called")
        self._validate_ip(oxe_ip)

        headers = ["SEQUENTIAL", "field0", "field1", "field2", "field3"]
        if auth_enabled:
            headers.append("field4")

        rows: list[list[str]] = []
        callee = called_start

        for caller in range(caller_start, caller_end + 1):
            if callee > called_end:
                callee = called_start

            row = [str(caller), str(callee), oxe_ip, str(oxe_port)]
            if auth_enabled:
                clean_pw = self._sanitize_value(auth_password or "secret")
                credential_vault._known_secrets.add(clean_pw)
                row.append(f"[authentication username={caller} password={clean_pw}]")

            rows.append(row)
            callee += 1

        file_path = self._write_csv_file(
            filename=f"INVITE_Caller_{prefix_tag}.csv",
            headers=headers,
            rows=rows
        )

        permissions = self._get_permissions_str(file_path)

        preview = CSVPreviewResponse(
            filename=file_path.name,
            delimiter=";",
            total_rows=len(rows),
            headers=headers,
            sample_rows=rows[:5],
            permissions=permissions,
            temp_path=str(file_path.as_posix())
        )

        return file_path, preview

    def generate_registration_csv(
        self,
        range_start: int,
        range_end: int,
        oxe_ip: str,
        role: str = "CALLER",
        auth_enabled: bool = False,
        auth_password: str | None = None,
        prefix_tag: str = "reg"
    ) -> tuple[Path, CSVPreviewResponse]:
        """Generate registration CSV for CALLER or CALLED."""
        self._validate_range(range_start, range_end, role.lower())
        self._validate_ip(oxe_ip)

        headers = ["SEQUENTIAL", "field0", "field1"]
        if auth_enabled:
            headers.append("field2")

        rows: list[list[str]] = []
        for ext in range(range_start, range_end + 1):
            row = [str(ext), oxe_ip]
            if auth_enabled:
                clean_pw = self._sanitize_value(auth_password or "secret")
                row.append(f"[authentication username={ext} password={clean_pw}]")
            rows.append(row)

        file_path = self._write_csv_file(
            filename=f"REGISTER_{role}_{prefix_tag}.csv",
            headers=headers,
            rows=rows
        )

        permissions = self._get_permissions_str(file_path)

        preview = CSVPreviewResponse(
            filename=file_path.name,
            delimiter=";",
            total_rows=len(rows),
            headers=headers,
            sample_rows=rows[:5],
            permissions=permissions,
            temp_path=str(file_path.as_posix())
        )

        return file_path, preview

    def _write_csv_file(self, filename: str, headers: list[str], rows: list[list[str]]) -> Path:
        target_dir = tempfile.mkdtemp(prefix="sipp_batch_", dir=self.temp_dir_root)
        file_path = Path(target_dir) / filename

        content_lines = [";".join(headers)]
        for r in rows:
            content_lines.append(";".join(r))

        content = "\n".join(content_lines) + "\n"
        file_path.write_text(content, encoding="utf-8")

        # POSIX chmod 600 restriction
        if os.name == "posix":
            try:
                os.chmod(file_path, 0o600)
            except OSError:
                pass

        return file_path

    @staticmethod
    def _sanitize_value(val: str) -> str:
        """Sanitize values to prevent CSV formula injection and dangerous characters."""
        if not val:
            return ""
        # Strip leading formula triggers if any
        if val[0] in ("=", "+", "-", "@"):
            val = "'" + val
        # Reject semicolon or newline characters which corrupt delimiter
        val = val.replace(";", "_").replace("\n", "").replace("\r", "")
        return val

    @staticmethod
    def _validate_range(start: int, end: int, label: str):
        if start <= 0 or end <= 0:
            raise ValueError(f"{label} extension numbers must be positive integers.")
        if start > end:
            raise ValueError(f"{label} start extension ({start}) cannot exceed end extension ({end}).")
        if (end - start) > 10000:
            raise ValueError(f"{label} range too large (max 10,000 subscribers per CSV).")

    @staticmethod
    def _validate_ip(ip_str: str):
        if not ip_str or not re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", ip_str):
            raise ValueError(f"Invalid IPv4 address format: '{ip_str}'")

    @staticmethod
    def _get_permissions_str(file_path: Path) -> str:
        if os.name == "posix":
            mode = oct(file_path.stat().st_mode & 0o777)
            return f"POSIX {mode}"
        return "Windows Default ACL (Owner Restricted)"

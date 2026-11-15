# PRIORITIZED DEFECT REGISTER (P0 - P3)
**Document Phase**: Phase 14A Audit & Stabilization  
**Authors**: QA Lead & Software Architect  
**Applicable Skills Applied**: `test-strategy`, `test-planning`, `api-testing`, `security-testing`  
**Date**: November 15, 2026  
**Status**: ALL AUDITED DEFECTS RESOLVED  

---

## 1. Defect Severity Definitions
- **P0 (Blocker / Critical)**: System crash, data loss, severe security vulnerability, credential compromise, or unhandled regression.
- **P1 (High)**: Major feature malfunction, broken workflow, insecure network communication, or portability violation.
- **P2 (Medium)**: Non-critical functionality defect, dead interactive UI control, visual inconsistency, or missing error boundary.
- **P3 (Low)**: Cosmetic imperfection, minor accessibility annotation omission, or minor code warning.

---

## 2. Audited Defects & Resolutions Summary

| ID | Severity | Category | Description | Root Cause | Status | Verification Evidence |
|---|---|---|---|---|---|---|
| **DEF-01** | **P0** | Security / Crypto | Windows DPAPI failure on profile migration or non-Windows host | `CryptProtectData` binds keys to Windows SID; lacked fallback and explicit profile mismatch handling | **RESOLVED** | Implemented `ICredentialProvider` with `WindowsDPAPIProvider` and `PortableFileProvider`. Handled `VaultProfileMismatchError`. Tested with standalone crypto script. |
| **DEF-02** | **P1** | Security / Network | Remote Linux SSH client disabled host key verification (`StrictHostKeyChecking=no`) | Defaulting to `/dev/null` known_hosts risked Man-in-the-Middle attacks on remote lab execution | **RESOLVED** | Migrated to `StrictHostKeyChecking=accept-new` with dedicated known_hosts repository at `config/ssh/known_hosts`. |
| **DEF-03** | **P1** | Architecture / Portability | Hardcoded lab IP `172.19.112.51` in backend services & models | Fallback IP hardcoded in configuration, execution, and reporting services violated architectural portability | **RESOLVED** | Removed all hardcoded `172.19.112.51` fallbacks; enforced strict DB-driven environment resolution with loopback `127.0.0.1` for local simulations. |
| **DEF-04** | **P1** | Architecture / Frontend | Frontend API calls hardcoded to `http://127.0.0.1:8000` | Views constructed absolute URLs independently, preventing proxying or port changes | **RESOLVED** | Created centralized `apps/frontend/src/lib/api.ts` module honoring `VITE_API_BASE_URL` with fallback to `http://127.0.0.1:8000`. Refactored all 11 views. |
| **DEF-05** | **P2** | UI / Interaction | Dead "Register PBX Node" button in `PbxManagementView` | Modal open state was defined but modal component was missing and button lacked onClick | **RESOLVED** | Created responsive registration modal with validation, node insertion, and toast feedback. Fixed empty state trigger. |
| **DEF-06** | **P2** | UI / Interaction | Non-functional "Save Changes" in `SettingsView` | Button lacked state dispatch and feedback indicator | **RESOLVED** | Implemented working save routine with `saveSuccess` indicator badge and `Restore Defaults` handler. |
| **DEF-07** | **P2** | UI / UX / Layout | Navigation sidebar unorganized & unusable on mobile viewports (<768px) | Flat 13-item list without grouping; fixed 256px width blocked mobile content | **RESOLVED** | Reorganized into 5 semantic sections; added responsive hamburger menu with dismissible backdrop drawer. |
| **DEF-08** | **P2** | Quality / Database | Crash simulation script threw `UNIQUE constraint failed: diagnostic_events.id` | Hardcoded event ID prefix collided when running multiple simulation sweeps | **RESOLVED** | Replaced static string prefix with `uuid.uuid4().hex[:8]`, ensuring idempotent simulation runs. |
| **DEF-09** | **P3** | UI / Design Tokens | Hardcoded slate colors across multiple views | `slate-900`, `slate-950` used directly instead of semantic design tokens | **RESOLVED** | Converted to `bg-card`, `border-border`, `bg-muted/30`, `text-foreground`. |
| **DEF-10** | **P3** | Accessibility | Form inputs in PBX and Settings views lacked explicit `htmlFor` / `id` bindings | Implicit wrapping caused screen reader navigation ambiguity | **RESOLVED** | Added explicit `id` and `htmlFor` attributes across all form controls. |

---

## 3. Residual Risk Assessment
- **Physical PBX Testing**: Direct signaling to the physical lab PBX (`172.19.112.51`) was explicitly excluded by scope constraints. The physical OXE integration status remains **NOT YET VALIDATED ON HARDWARE** until scheduled lab window access.
- **Simulated Test Harness**: All simulation capabilities, single-host process management, port collision detection, and telemetry streams are verified with 100% test pass rate.

# Multi-Tier Testing Strategy & Verification Gates

## 1. Multi-Tier Testing Hierarchy
Testing strictly distinguishes between software layers:

### Tier 1: Backend Unit & Integration Tests (Pytest)
- **Location:** `tests/backend/`
- **Scope:** REST endpoints, schema validation, runner contracts, runtime adapters, and error handling.
- **Execution Command:** `.venv\Scripts\pytest.exe tests\backend -v --cov=apps/backend`

### Tier 2: Frontend Unit & Component Tests (Vitest + React Testing Library)
- **Location:** `apps/frontend/src/test/`
- **Scope:** Component rendering, prop variations, badge states, and log viewer behavior.
- **Execution Command:** `cd apps/frontend && npx vitest run`

### Tier 3: Component Visual Isolation (Storybook)
- **Location:** `apps/frontend/src/components/*.stories.tsx`
- **Scope:** Visual regression and component state isolation without running backend.
- **Execution Command:** `cd apps/frontend && npm run build-storybook`

### Tier 4: Browser E2E Automation (Playwright)
- **Location:** `apps/frontend/e2e/`
- **Scope:** End-to-end user workflows, navigation, and WCAG accessibility audits (`@axe-core/playwright`).
- **Execution Command:** `cd apps/frontend && npx playwright test`

### Tier 5: SIP Protocol Regression Suite (`regression_test.py`)
- **Location:** `tests/regression_test.py`
- **Scope:** Preserved 29-test automated regression suite testing SIPp scenarios, provisional sequences, branch isolation, and monotonic CSeq counters.
- **Execution Command:** `python tests/regression_test.py` (inside compatible SIPp environment).

### Tier 6: Physical OXE Hardware Acceptance
- **Scope:** Physical PBX lab validation on `172.19.112.51`.
- **Status:** Strictly classified as **NOT TESTED (Awaiting Lab Access)** during synthetic software development. Never perform against unverified hardware.

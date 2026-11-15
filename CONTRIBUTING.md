# CONTRIBUTING.md — Code Standards & Contribution Guidelines

## 1. Monorepo Principles
- Follow the approved modular monorepo structure (`apps/`, `shared/`, `assets/`, `docs/`, `tests/`).
- Do not create competing folder hierarchies.
- All new API models must be defined in `shared/schemas/`.
- All execution runners must implement `shared/contracts/runner.py`.

## 2. Coding Standards
- **Python Backend**:
  - Python 3.10+ modern type hinting (`list[str]`, `str | None`).
  - Linter: `ruff` rules enforced (run `.venv\Scripts\ruff.exe check --fix`).
  - Strict async/await patterns for network and process lifecycle operations.
- **React Frontend**:
  - React 18 with TypeScript strict mode enabled (`noImplicitAny: true`).
  - All reusable components must live in `apps/frontend/src/components/` with an accompanying Storybook story (`.stories.tsx`).
  - Use Tailwind utility classes following the telecom dark theme palette (`slate-950`, `slate-900`, `slate-800`).
  - Use shadcn/ui patterns and Lucide icons.

## 3. Git & Safety Rules
- Work only on designated feature branches (e.g. `feature/phase3a-sip-hardening`).
- Never force push or commit without explicit review and approval.
- Preserve 100% of existing SIP scenario files with zero diff.

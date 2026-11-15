# AGENTS.md — Agent Operating Rules & Invariants

## 1. Project Invariants
- **Preserve Existing Assets**: Never delete or rewrite existing SIP scenarios (`*.xml`), baseline scripts (`sipp_manager.sh`), or historical assets.
- **Portability**: Never hardcode absolute or machine-specific paths (e.g. `C:\Users\...` or `/home/...`). Use dynamically resolved repository roots.
- **Contract Isolation**: All execution runners must implement `IExecutionRunner` (`shared/contracts/runner.py`). Never bypass this contract to directly execute shell commands.
- **Security**: Never output plaintext passwords (`AUTH_PASSWORD`). Always mask them in logs and API models. All generated CSVs must enforce `chmod 600`.
- **Evidence-Based Reporting**: Never report an integration, test, or hardware feature as working without running actual commands and reporting literal outputs.
- **OXE SIP Domain Rules**: Strict adherence to RFC 3261, RFC 3262 (PRACK/100rel), RFC 2617 (Digest Auth), and Alcatel-Lucent Enterprise Request-URI/QMCDU routing conventions (see [docs/architecture/OXE_SIP_DOMAIN_INVARIANTS.md](docs/architecture/OXE_SIP_DOMAIN_INVARIANTS.md)).
- **UI/UX & State Handling**: Every page and component must explicitly implement Empty, Loading, Error, and Populated states (see [docs/design/FRONTEND_DESIGN_SYSTEM.md](docs/design/FRONTEND_DESIGN_SYSTEM.md)).
- **Multi-Tier Testing Hierarchy**: Adhere to the multi-tier testing standards defined in [docs/testing/TEST_STRATEGY.md](docs/testing/TEST_STRATEGY.md).

## 2. Directory Ownership
- `apps/backend/`: FastAPI application, routers, services, adapters, SQLite database.
- `apps/frontend/`: React 18, TypeScript, Tailwind, Storybook, Playwright E2E.
- `apps/runner/`: Execution runner implementations (SimulatedRunner).
- `shared/`: Shared Pydantic schemas and abstract Python contracts.
- `assets/sipp/`: Unchanged SIP scenarios and CSV injection files.
- `docs/`: Architecture specifications, UI/UX designs, and technical decisions.
- `tests/`: Pytest backend tests and preserved regression suites.
- `.agents/skills/`: Single authentic upstream agent skills directory.

## 3. Mandatory Agent Skill Usage Policy

### 3.1 Core Requirement
All development activities MUST use the relevant installed external Agent Skills from `.agents/skills/`.
Skills are mandatory development resources, not optional suggestions.

Before starting any implementation:
1. Inspect the available skills under `.agents/skills/`.
2. Identify the skills relevant to the requested task.
3. Read the complete `SKILL.md` files for those skills.
4. Read any additional reference files explicitly required by those skills.
5. Apply their instructions throughout implementation and verification.
Never rely on skill names or descriptions alone. Read the actual instructions.

### 3.2 Mandatory Skill Mapping
- **UI/UX Design and Frontend**: For every new UI page, component, dashboard, modal, form, layout, or significant visual modification, use `ui-ux-pro-max`, `impeccable`, `frontend-design`, `web-design-guidelines`, and `vercel-react-best-practices`.
- **Backend and Application Architecture**: For backend services, APIs, database models, execution adapters, and orchestration, consult the relevant architecture and testing skills, adhering to `AGENTS.md` and established module boundaries.
- **Testing and Quality Assurance**: For every implementation, use relevant QA skills (`test-strategy`, `test-planning`, `unit-testing`, `api-testing`, `playwright-automation`, `exploratory-testing`, `accessibility-testing`, `visual-testing`, `performance-testing`, `security-testing`). Define approach beforehand, write tests alongside code, execute test suites, run browser/accessibility validations, and report literal outputs.

### 3.3 Mandatory Implementation Workflow
1. Inspect the existing implementation.
2. Identify applicable skills.
3. Read the relevant skill instructions.
4. Prepare the implementation and testing approach.
5. Implement using the applicable skill guidance.
6. Execute relevant automated tests.
7. Perform UI/browser validation where applicable.
8. Review the implementation for regressions.
9. Update relevant documentation.
10. Produce a completion report with the Mandatory Skill Usage Report table.

### 3.4 Mandatory Skill Usage Reporting Format
At the conclusion of each implementation task, include:

| Skill | Required for task? | Loaded/read? | Applied? | Evidence |
|---|---|---|---|---|
| UI UX Pro Max | Yes/No | Yes/No | Yes/No | Specific design decisions |
| Impeccable | Yes/No | Yes/No | Yes/No | Specific improvements |
| Frontend Design | Yes/No | Yes/No | Yes/No | Implementation decisions |
| React Best Practices | Yes/No | Yes/No | Yes/No | Architecture/performance changes |
| Web Design Guidelines | Yes/No | Yes/No | Yes/No | Accessibility/responsive checks |
| Testing Strategy | Yes/No | Yes/No | Yes/No | Test strategy |
| Playwright Automation | Yes/No | Yes/No | Yes/No | E2E test evidence |
| Other relevant QA skills | Yes/No | Yes/No | Yes/No | Test evidence |

Distinguish explicitly between:
- **Installed**: Skill files exist.
- **Loaded**: Instructions were actually read.
- **Applied**: Guidance influenced implementation.
- **Verified**: Relevant checks were executed successfully.


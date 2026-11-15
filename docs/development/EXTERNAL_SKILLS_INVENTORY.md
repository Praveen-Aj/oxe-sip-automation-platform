# External Agent Skills Inventory & Verification Report

**Project:** OXE SIP Automation Platform (Cross-Platform Monorepo)  
**Date:** November 14, 2026  
**Auditor:** Senior Software Architect  
**Canonical Directory:** `.agents/skills/`  
**Status:** Cleaned & Verified (Duplicate `.agent/skills/` removed)

---

## 1. Upstream Skills Directory Architecture

Following the skill directory cleanup:
- **Canonical Upstream Directory:** `.agents/skills/` (managed via `skills` CLI and official upstream installer packages).
- **Duplicate Directory:** `.agent/skills/` was completely removed.
- **Project Documentation Migration:** High-value enterprise domain rules, backend architecture standards, frontend design system guidelines, and multi-tier testing standards were migrated into the project documentation tree:
  - [docs/architecture/OXE_SIP_DOMAIN_INVARIANTS.md](../architecture/OXE_SIP_DOMAIN_INVARIANTS.md)
  - [docs/architecture/BACKEND_ARCHITECTURE.md](../architecture/BACKEND_ARCHITECTURE.md)
  - [docs/design/FRONTEND_DESIGN_SYSTEM.md](../design/FRONTEND_DESIGN_SYSTEM.md)
  - [docs/testing/TEST_STRATEGY.md](../testing/TEST_STRATEGY.md)
  - [AGENTS.md](../../AGENTS.md)

---

## 2. Inventory of Upstream Agent Skills

| Skill Identifier | Source Repository | Installation Method | Path | Status |
|---|---|---|---|---|
| **ui-ux-pro-max** | `nextlevelbuilder/ui-ux-pro-max-skill` | `uipro init --ai antigravity` | `.agents/skills/ui-ux-pro-max` | **Verified Active** |
| **banner-design** | `nextlevelbuilder/ui-ux-pro-max-skill` | `uipro init --ai antigravity` | `.agents/skills/banner-design` | **Verified Active** |
| **brand** | `nextlevelbuilder/ui-ux-pro-max-skill` | `uipro init --ai antigravity` | `.agents/skills/brand` | **Verified Active** |
| **design** | `nextlevelbuilder/ui-ux-pro-max-skill` | `uipro init --ai antigravity` | `.agents/skills/design` | **Verified Active** |
| **design-system** | `nextlevelbuilder/ui-ux-pro-max-skill` | `uipro init --ai antigravity` | `.agents/skills/design-system` | **Verified Active** |
| **slides** | `nextlevelbuilder/ui-ux-pro-max-skill` | `uipro init --ai antigravity` | `.agents/skills/slides` | **Verified Active** |
| **ui-styling** | `nextlevelbuilder/ui-ux-pro-max-skill` | `uipro init --ai antigravity` | `.agents/skills/ui-styling` | **Verified Active** |
| **impeccable** | `pbakaus/impeccable` | `npx skills add pbakaus/impeccable` | `.agents/skills/impeccable` | **Verified Active** |
| **frontend-design** | `anthropics/skills` | `npx skills add anthropics/skills` | `.agents/skills/frontend-design` | **Verified Active** |
| **vercel-react-best-practices** | `vercel-labs/agent-skills` | `npx skills add vercel-labs/agent-skills` | `.agents/skills/vercel-react-best-practices` | **Verified Active** |
| **web-design-guidelines** | `vercel-labs/agent-skills` | `npx skills add vercel-labs/agent-skills` | `.agents/skills/web-design-guidelines` | **Verified Active** |
| **accessibility-testing** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/accessibility-testing` | **Verified Active** |
| **api-testing** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/api-testing` | **Verified Active** |
| **exploratory-testing** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/exploratory-testing` | **Verified Active** |
| **performance-testing** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/performance-testing` | **Verified Active** |
| **playwright-automation** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/playwright-automation` | **Verified Active** |
| **security-testing** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/security-testing` | **Verified Active** |
| **test-planning** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/test-planning` | **Verified Active** |
| **test-strategy** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/test-strategy` | **Verified Active** |
| **unit-testing** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/unit-testing` | **Verified Active** |
| **visual-testing** | `petrkindlmann/qa-skills` | `npx skills add petrkindlmann/qa-skills` | `.agents/skills/visual-testing` | **Verified Active** |

---

## 3. Verification Commands & Outputs

```powershell
# Verification of canonical skills list
npx skills list
```
All 21 skills verified active with zero duplicates.

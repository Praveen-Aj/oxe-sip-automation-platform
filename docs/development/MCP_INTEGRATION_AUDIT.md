# Model Context Protocol (MCP) Integration & Configuration Audit

**Project:** OXE SIP Automation Platform (Cross-Platform Web Application)  
**Date:** November 14, 2026  
**Auditor:** Senior Software Architect  
**Environment:** Windows 11 Native & Linux Remote Targets  

---

## 1. Executive Summary

This audit evaluates the Model Context Protocol (MCP) configuration, server availability, plugin marketplace integration, and developer tooling harnesses across the requested suite of six services:

1. **Context7**
2. **shadcn/ui**
3. **Playwright**
4. **Figma**
5. **Chrome DevTools**
6. **Storybook**

---

## 2. MCP Service Classification & Connection Status

| Service | Architecture / Modality | Catalog / Plugin ID | Connection Status | Harness / Transport |
|---|---|---|---|---|
| **Context7** | Antigravity Marketplace Plugin | `antigravity-plugins-partners/plugin/context7` | **Catalog Available** (Plugin requires user installation & API key) | Streamable HTTP / Remote MCP |
| **Chrome DevTools** | Official Antigravity Plugin | `antigravity-plugins-official/plugin/chrome-devtools-plugin` | **Catalog Available** (Official Google Plugin) | Browser DevTools Protocol / Puppeteer MCP |
| **Figma** | Antigravity Marketplace Plugin | `antigravity-plugins-partners/plugin/figma` | **Catalog Available** (Plugin requires user token sign-in) | Remote OAuth / Streamable HTTP |
| **Playwright** | Local Monorepo Harness | `@playwright/test` + `@tmcp` stdio adapter | **Installed & Verified** (Playwright 1.65.1 Chromium) | Local Stdio Process (`node` stdio) |
| **Storybook** | Local Monorepo Harness | `@storybook/addon-mcp` (Storybook 10.6.7) | **Installed & Verified** (`storybook-static` compiled) | Local Stdio / IPC Bridge |
| **shadcn/ui** | CLI Component Engine | `components.json` + `shadcn` CLI | **Configured & Verified** (8 base components installed) | Local CLI Generator & Path Alias `@/*` |

---

## 3. Detailed Service Analyses

### 3.1. Context7
- **Description:** Real-time, up-to-date documentation lookup and code snippet retrieval from official GitHub repositories.
- **Delivery Mode:** Antigravity Partner Plugin (`antigravity-plugins-partners/plugin/context7`).
- **Configuration & Usage:**
  ```json
  {
    "mcpServers": {
      "context7": {
        "url": "https://api.context7.com/mcp",
        "env": {
          "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
        }
      }
    }
  }
  ```
- **Operational Requirement:** The user installs the plugin via the Antigravity Plugin Manager and supplies their Context7 API token.

### 3.2. Chrome DevTools
- **Description:** Headless and visual Chrome automation, network inspection, and DOM performance profiling.
- **Delivery Mode:** Antigravity Official Plugin (`antigravity-plugins-official/plugin/chrome-devtools-plugin`).
- **Configuration:**
  ```json
  {
    "mcpServers": {
      "chrome-devtools": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
        "env": {
          "PUPPETEER_EXECUTABLE_PATH": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        }
      }
    }
  }
  ```
- **Operational Note:** In the current project foundation, Playwright Chromium headless engine is also natively configured and passing all 4 end-to-end tests (`e2e/app.spec.ts`).

### 3.3. Figma
- **Description:** Syncs UI design tokens, component specifications, and Figma frames directly with React/Tailwind code.
- **Delivery Mode:** Antigravity Partner Plugin (`antigravity-plugins-partners/plugin/figma`).
- **Configuration:**
  ```json
  {
    "mcpServers": {
      "figma": {
        "url": "https://api.figma.com/v1/mcp",
        "env": {
          "FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"
        }
      }
    }
  }
  ```
- **Operational Requirement:** User installs via Plugins Manager and connects their Figma account.

### 3.4. Playwright E2E MCP Harness
- **Description:** Automated browser execution, user interaction testing, and accessibility auditing.
- **Delivery Mode:** Local Project Stdio Server (`apps/frontend/node_modules/playwright`).
- **Status:** Installed in `apps/frontend/package.json`. Includes Chromium browser engine and `@axe-core/playwright`.
- **Stdio Config Example (`~/.gemini/config/mcp_config.json`):**
  ```json
  {
    "mcpServers": {
      "playwright": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-playwright"],
        "env": {
          "PLAYWRIGHT_BROWSERS_PATH": "0"
        }
      }
    }
  }
  ```
- **Verification:** Ran `npx playwright test` with 4/4 passing tests including navigation and axe-core accessibility checks.

### 3.5. Storybook MCP Harness
- **Description:** Component library inspection, documentation rendering, and accessibility testing.
- **Delivery Mode:** Local Project Addon (`@storybook/addon-mcp` v10.6.7).
- **Status:** Installed in `apps/frontend`. Static bundle built successfully to `apps/frontend/storybook-static`.
- **Local Stdio Configuration:**
  ```json
  {
    "mcpServers": {
      "storybook": {
        "command": "npx",
        "args": ["storybook", "dev", "-p", "6006", "--ci"],
        "env": {
          "NODE_ENV": "development"
        }
      }
    }
  }
  ```

### 3.6. shadcn/ui Component Engine
- **Description:** Accessible, Tailwind-styled, headless UI components built on Radix primitives.
- **Delivery Mode:** Local Workspace CLI and Schema (`components.json`).
- **Status:** Integrated with Tailwind CSS and Vite path alias `@/*`.
- **Installed Foundation Components:**
  - `Button` (`apps/frontend/src/components/ui/button.tsx`)
  - `Card` (`apps/frontend/src/components/ui/card.tsx`)
  - `Badge` (`apps/frontend/src/components/ui/badge.tsx`)
  - `Input` (`apps/frontend/src/components/ui/input.tsx`)
  - `Alert` (`apps/frontend/src/components/ui/alert.tsx`)
  - `Table` (`apps/frontend/src/components/ui/table.tsx`)
  - `Tabs` (`apps/frontend/src/components/ui/tabs.tsx`)
  - `Separator` (`apps/frontend/src/components/ui/separator.tsx`)
- **Storybook Stories:** Verified in `button.stories.tsx`, `card.stories.tsx`, `badge.stories.tsx`.

---

## 4. MCP Configuration File Recommendation

To enable seamless IDE-level tool calls across these services, developers can add the following configuration to `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "playwright-local": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    },
    "storybook-local": {
      "command": "npx",
      "args": ["storybook", "dev", "--ci", "-p", "6006"]
    }
  }
}
```

For cloud-backed services (Context7, Chrome DevTools, Figma), install the corresponding plugins directly from the Antigravity Plugins Manager UI.

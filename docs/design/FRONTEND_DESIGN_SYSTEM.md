# Frontend Design System & UI/UX Standards

## 1. Visual Language
The user interface is engineered for Telecom Test Engineers, Network Operators, and Voice Core Specialists. Interaction patterns are inspired by **Grafana, Postman, Portainer, and Wireshark**.

## 2. Invariant Rules

### 1. Design Tokens & Palette
- Primary Background: Dark theme `bg-slate-950` with high-contrast `text-slate-100`.
- Card Surfaces: `bg-slate-900` with subtle border `border-slate-800`.
- Protocol Status:
  - Emerald / Green: Verified, Active Call, 200 OK.
  - Sky / Blue: Signaling events, 100 Trying, 180/183 Progress.
  - Purple: Digest Challenges (401 / 407).
  - Amber / Yellow: Warnings, Retransmissions, In-Progress.
  - Rose / Red: Rejections (4xx/5xx), Socket conflicts, Errors.

### 2. Typography
- UI chrome and labels: Clean sans-serif (Inter / system fonts).
- SIP Headers, CSeq, IP addresses, ports, and logs: Monospace (`font-mono` / JetBrains Mono).

### 3. Component Encapsulation & Storybook
- Every reusable visual component in `apps/frontend/src/components/` MUST have a corresponding `.stories.tsx` file.
- Stories must cover all functional variants (e.g. `CallRate`, `TotalCalls`, `FailedCalls`, `Errors`).

### 4. State Handling
- Every page and component must explicitly handle **Empty States**, **Loading States**, and **Error States**.

# Scenario Catalogue and Configuration Engine Architecture

## 1. Overview
The Scenario Catalogue and Configuration Engine provide the core test preparation capabilities for the OXE SIP Automation Platform. They bridge raw SIPp XML scenarios and environment profiles into validated, execution-ready test configurations and dynamic subscriber CSV injection files.

---

## 2. Subsystem 1: Scenario Catalogue

### 2.1 Dynamic Discovery & Path Resolution
The `ScenarioService` dynamically scans the `assets/sipp/` directory (resolving absolute paths from the project root) for all XML files. It extracts metadata without mutating or rewriting any baseline asset.

### 2.2 Classification Pipeline
Scenarios are inspected via `xml.etree.ElementTree` and categorized into:
- **Role**:
  - `UAC`: Starts with `<send>` (e.g. `INVITE_Caller_Auth_PRACK.xml`).
  - `UAS`: Starts with `<recv>` (e.g. `INVITE_Called.xml`).
  - `REG`: Contains `<send>` with `REGISTER` method.
- **Protocol Capabilities**:
  - `Authentication`: Presence of `[authentication` tags, `401`, or `407` challenge blocks.
  - `PRACK / 100rel`: Presence of `Supported: 100rel`, `Require: 100rel`, `PRACK`, or `200 OK PRACK`.
  - `Media / SDP`: Presence of `<action><exec rtp_stream="..."/></action>` or SDP `m=audio` blocks. Detected audio codecs (e.g. `PCMA`, `PCMU`).
  - `PUBLISH`: Presence of `PUBLISH` method.
- **CSV Injection Fields**:
  - Discovers all `[field0]`, `[field1]`, `[field2]`, `[field3]`, `[field4]` references in SIP headers.

---

## 3. Subsystem 2: Configuration Engine

### 3.1 5-Step Parameterization Wizard
1. **Target Environment**: Select active environment (e.g. `Hardware Lab OXE Primary`, `Local Simulation`).
2. **SIP Scenario Asset**: Select scenario from discovered catalog.
3. **Dialplan Subscribers & Ports**: Configure Caller/Called ranges (QMCDU dialplan compliance), local SIP ports (5060, 5080), transport (UDP/TCP/TLS).
4. **Traffic & Protocol Options**: Set Calls Per Second (CPS), total call count, Digest Authentication password injection, 100rel PRACK, audio codecs.
5. **Review, Save & CSV Preview**: Review configuration summary, save to SQLite (`test_configurations`), and generate dynamic CSV injection files.

### 3.2 Dynamic CSV Generation Standards
- **Delimiter**: Semicolon (`;`) delimiter, adhering to Alcatel-Lucent OmniPCX Enterprise SIPp injection format.
- **Sequential Header**: Starts with `SEQUENTIAL;field0;field1;field2;field3;field4`.
- **Digest Authentication Block**: Injects `[authentication username=<ext> password=<pw>]` into `field4`.
- **Security & Permissions**:
  - Enforces `chmod 600` on POSIX systems (`-rw-------`).
  - Passwords masked (`********`) in responses and UI views.
  - Formula injection sanitization strips leading `=`, `+`, `-`, `@`.

---

## 4. REST Endpoints
- `GET /api/v1/scenarios`: List all discovered scenarios with filters (`role`, `category`, `search`).
- `GET /api/v1/scenarios/{id}`: Detailed scenario metadata.
- `GET /api/v1/scenarios/{id}/content`: Raw XML scenario content.
- `POST /api/v1/scenarios/discover`: Re-scan asset directory.
- `GET /api/v1/configurations`: List saved test configurations.
- `POST /api/v1/configurations`: Create and save configuration.
- `GET /api/v1/configurations/{id}`: Retrieve configuration.
- `POST /api/v1/configurations/{id}/generate-csv`: Generate and preview subscriber CSV.

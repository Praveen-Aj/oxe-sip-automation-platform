# UI/UX DESIGN SPECIFICATION: OXE SIP AUTOMATION WEB PLATFORM

**Date**: November 14, 2026  
**Product Designer**: Senior Telecom UX/UI Product Designer  
**Frontend Stack**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons, Recharts.

---

## 1. Visual Language & Design System

The application is engineered specifically for Telecom Test Engineers and Voice Core Specialists. It employs a clean, high-density, professional interface optimized for monitoring live protocol flows.

### Theme & Styling Parameters
- **Theme Support**: Default Dark Mode (`slate-950` background, `slate-900` card surfaces, `slate-100` high-contrast typography) with optional Light Mode.
- **Color Coding**:
  - `Emerald-500` / `Green-500`: Verified, Ready, Passed, Active Call.
  - `Amber-500` / `Yellow-500`: Warning, In-Progress, Retrying, Unreliable Provisional.
  - `Rose-500` / `Red-500`: Error, Rejection (4xx/5xx), Socket Conflict, Terminated.
  - `Sky-500` / `Blue-500`: Information, Signaling Message, PRACK / 100rel.
  - `Purple-500`: Authentication Challenge (401/407).
- **Typography**: Inter / system sans-serif for UI labels; JetBrains Mono / Roboto Mono for SIP headers, CSeq values, timestamps, and log streams.

---

## 2. Navigation Architecture

```
+----------------------------------------------------------------------------------------------------+
|  [OXE SIP TOOLKIT]   Active Environment: [OXE_LAB_LAN_01 v]   Runtime: [WSL2 Ubuntu (v3.7.7) v]   |
+----------------------+-----------------------------------------------------------------------------+
|  [Sidebar]           |  [Main Content Area]                                                        |
|  - Dashboard         |                                                                             |
|  - Environments      |  Dynamic page based on selected route                                       |
|  - Scenario Catalog  |                                                                             |
|  - Preflight Check   |                                                                             |
|  - Test Execution    |                                                                             |
|  - Live Monitor      |                                                                             |
|  - Test History      |                                                                             |
|  - PBX Tools         |                                                                             |
|  - Diagnostics       |                                                                             |
|  - Settings          |                                                                             |
+----------------------+-----------------------------------------------------------------------------+
```

---

## 3. Page Specifications & Textual Wireframes

### 3.1 Dashboard (`/dashboard`)
- **Purpose**: At-a-glance health of the testbed, active environment, node readiness, and summary of recent executions.
- **Wireframe Layout**:
```
+----------------------------------------------------------------------------------------------------+
| DASHBOARD                                                       [ Quick Run ] [ Preflight Check ]  |
+----------------------------------------------------------------------------------------------------+
| [ SYSTEM STATUS ]           [ ACTIVE ENVIRONMENT ]        [ RUNTIME ENGINE ]                       |
| Status: READY               Name: OXE_LAB_LAN_01          Binary: /usr/bin/sipp (v3.7.7)           |
| OS: Windows 11 (WSL2)       OXE:  172.19.112.51:5060      Features: TLS, PCAP, SCTP, SHA256        |
| Active Calls: 0             Mode: PRACK + Auth (Combined) Platform: WSL2 Ubuntu Bridge             |
+----------------------------------------------------------------------------------------------------+
| TESTBED READINESS MATRIX                                                                           |
| [CALLER Node: 172.19.112.50]  -->  [OXE PBX: 172.19.112.51]  <--  [CALLED Node: 172.19.112.60]    |
| Status: ONLINE (Port 5060 OK)      Status: TRUNK ACTIVE           Status: LISTENING (Port 5080 OK) |
+----------------------------------------------------------------------------------------------------+
| RECENT TEST EXECUTIONS                                                    [ View All History -> ]   |
| ID        Scenario                 Mode            Total  Pass   Fail   Duration   Timestamp       |
| #1042     INVITE_Caller_Auth_PRACK Combined (1,1)   100    100    0      10.2s     2 mins ago [OK] |
| #1041     REGISTER_Auth            Auth (1,0)       200    200    0      4.1s      15 mins ago[OK] |
| #1040     INVITE_Caller_PRACK      PRACK (0,1)      50     49     1      8.5s      1 hour ago [WRN]|
+----------------------------------------------------------------------------------------------------+
```

### 3.2 Scenario Catalogue (`/scenarios`)
- **Purpose**: Categorized view of verified SIP scenarios. Filters by capability (Auth, PRACK, Publish, Baseline).
- **Wireframe Layout**:
```
+----------------------------------------------------------------------------------------------------+
| SCENARIO CATALOGUE                                              Search: [ 100rel            ]      |
| Filter: [ All ] [ Baseline ] [ Authenticated ] [ Reliable PRACK ] [ Combined ]                     |
+----------------------------------------------------------------------------------------------------+
| [ CARD: Combined Authentication + PRACK ]                             [ Mode: AUTH=1, PRACK=1 ]    |
| File: INVITE_Caller_Auth_PRACK.xml                                    Status: VERIFIED             |
| Description: Handles 401/407 digest challenge with Via branch         Transport: UDP / TCP         |
|              isolation, authenticates retried INVITE, absorbs         Max CSeq: 4 BYE              |
|              reliable 180/183, and issues PRACK (CSeq 3).             Role: CALLER (UAC)           |
| Expected Flow: INVITE -> 401/407 -> ACK -> INVITE -> 183 -> PRACK -> 200 -> ACK -> BYE            |
|                                                                       [ Configure & Run -> ]       |
+----------------------------------------------------------------------------------------------------+
| [ CARD: Reliable Provisional PRACK (100rel) ]                         [ Mode: AUTH=0, PRACK=1 ]    |
| File: INVITE_Caller_PRACK.xml                                         Status: VERIFIED             |
| Description: Advertises Supported: 100rel, parses discrete Require    Transport: UDP / TCP         |
|              token, validates numeric RSeq, and sends PRACK.          Role: CALLER (UAC)           |
|                                                                       [ Configure & Run -> ]       |
+----------------------------------------------------------------------------------------------------+
```

### 3.3 Test Configuration & Preflight Console (`/scenarios/:id/configure`)
- **Purpose**: Dynamic parameter customization and preflight validation before launching tests.
- **Wireframe Layout**:
```
+----------------------------------------------------------------------------------------------------+
| CONFIGURE TEST RUN: INVITE_Caller_Auth_PRACK                                                       |
+----------------------------------------------------------------------------------------------------+
| TEST PARAMETERS                             | PREFLIGHT VERIFICATION MATRIX                        |
| Environment: [ OXE_LAB_LAN_01           v ] |                                                      |
| Caller Extension Range: [ 55001 ] to [55010]| [PASS] SIPp Runtime Valid (v3.7.7-TLS-PCAP)          |
| Called Extension Range: [ 55011 ] to [55020]| [PASS] Scenario XML Syntax Verified                  |
| Total Calls:            [ 100             ] | [PASS] Dynamic CSV Generated (chmod 600 verified)    |
| Call Rate:              [ 10  ] calls/sec   | [PASS] Local SIP Port 5060 Available                 |
| Transport Protocol:     (o) UDP  ( ) TCP    | [PASS] OXE Target 172.19.112.51 Reachable            |
| SIP Authentication:     [X] Enabled (401/407| [PASS] Password Sanitization Active                  |
| Digest Password:        [ ********        ] | [WARN] High Call Rate (>50 cps) on Lab PBX           |
| Debug Trace Flags:      [X] Enabled (-trace)|                                                      |
|                                             | Status: READY FOR EXECUTION                          |
|                                             | [ Re-run Checks ]            [ LAUNCH TEST RUN ]     |
+----------------------------------------------------------------------------------------------------+
```

### 3.4 Live Monitoring Console (`/executions/:id/live`)
- **Purpose**: Real-time WebSocket streaming of call rates, SIP response distribution, and live logs.
- **Wireframe Layout**:
```
+----------------------------------------------------------------------------------------------------+
| EXECUTION #1042: INVITE_Caller_Auth_PRACK [ RUNNING ]             [ PAUSE ] [ STOP EXECUTION ]     |
+----------------------------------------------------------------------------------------------------+
| Elapsed: 00:00:08   | Calls: 80 / 100   | Current Rate: 10.0 cps | Failed Calls: 0 | Retrans: 0    |
+---------------------+-------------------+------------------------+-----------------+---------------+
| SIP RESPONSE CODE DISTRIBUTION (REAL-TIME)                                                         |
| 100 Trying: [==== 80   ]   183 Progress: [==== 80 (100rel)]   PRACK 200: [==== 80   ]              |
| 407 Challenge: [==== 80]   200 OK (INVITE): [==== 72      ]   BYE 200:   [==== 65   ]              |
+----------------------------------------------------------------------------------------------------+
| LIVE SIP PROTOCOL LOG STREAM (WebSocket: Connected)                       [ Auto-Scroll: ON ]      |
| 21:15:02.102 [OUT] INVITE sip:55011@172.19.112.51:5060 CSeq: 1 INVITE (branch=z9hG4bK-1042-1)     |
| 21:15:02.106 [IN ] SIP/2.0 407 Proxy Authentication Required (nonce="df83a2...")                   |
| 21:15:02.107 [OUT] ACK sip:55011@172.19.112.51:5060 CSeq: 1 ACK (top branch preserved)           |
| 21:15:02.109 [OUT] INVITE sip:55011@172.19.112.51:5060 CSeq: 2 INVITE (with Proxy-Authorization)  |
| 21:15:02.115 [IN ] SIP/2.0 183 Session Progress (Require: 100rel, RSeq: 101)                       |
| 21:15:02.116 [OUT] PRACK sip:55011@172.19.112.51:5060 CSeq: 3 PRACK (RAck: 101 2 INVITE)          |
| 21:15:02.120 [IN ] SIP/2.0 200 OK (to PRACK)                                                      |
| 21:15:02.340 [IN ] SIP/2.0 200 OK (to INVITE CSeq 2)                                              |
| 21:15:02.341 [OUT] ACK sip:55011@172.19.112.51:5060 CSeq: 2 ACK                                   |
+----------------------------------------------------------------------------------------------------+
```

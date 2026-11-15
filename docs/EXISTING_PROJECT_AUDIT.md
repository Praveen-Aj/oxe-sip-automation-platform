# EXISTING PROJECT AUDIT: OXE SIP AUTOMATION TOOLKIT

**Date**: November 14, 2026  
**Auditor**: Senior Software Architect / Telecom Automation Specialist  
**Current Git Head**: `82f855e` (`feature/phase3a-sip-hardening`)  
**Base Commit**: `5494cb7`  
**Preservation Status**: 100% of Phase 2 baseline scenarios preserved (`git diff 5494cb7` on baseline files is 0 bytes).

---

## 1. Executive Summary & Existing Project Architecture

The **OXE SIP Automation Toolkit** is a specialized test automation and provisioning suite tailored specifically for Alcatel-Lucent Enterprise OmniPCX Enterprise (OXE) PBX systems. It coordinates SIP signaling test runs between two dedicated traffic generation servers:
- **CALLER Host** (UAC): Generates SIP traffic (Registration, Outgoing Calls, Authentication Challenges, PRACK, In-Dialog ACK/BYE, VoIP Quality Metrics).
- **CALLED Host** (UAS): Acts as the call terminator / receiver, providing reliable/unreliable provisional ringing/progress and answering incoming INVITEs.

The toolkit also interacts directly with the physical OXE PBX via SSH or Telnet to dynamically provision or deprovision SIP subscriber accounts (`QMCDU` numbers) inside the OXE database (`mtcl` user domain).

```
                      +-----------------------------+
                      |      OXE PBX (CS / CPU)     |
                      |  172.19.112.51:5060 (LAN)   |
                      |  192.168.1.51:5060 (WAN)    |
                      +--------------+--------------+
                                     ^
                    SIP Registration | SIP Inbound/Outbound
                    & Provisioning   | Proxy Routing
                                     v
       +-----------------------------+-----------------------------+
       |                                                           |
+------+----------------------+                             +------+----------------------+
|     CALLER Host (UAC)       |     Peer Sync (rsync/ssh)   |      CALLED Host (UAS)      |
|  172.19.112.50 / .8         |<===========================>|  172.19.112.60 / .7         |
|                             |                             |                             |
|  - sipp_manager.sh (Menu)   |                             |  - sipp_manager.sh (Menu)   |
|  - UAC Scenarios            |                             |  - UAS Scenarios            |
|  - CSV Injection Files      |                             |  - Passive Listener         |
|  - oxe_remote.py (Deploy)   |                             |  - sync_watcher.py (Daemon) |
+-----------------------------+                             +-----------------------------+
```

---

## 2. Directory Structure & File Inventory

The active repository contains 28 tracked files and an `archive/` subfolder:

| File Name | Category | Primary Role / Responsibility | Lines | Reusability in Web App |
| :--- | :--- | :--- | :--- | :--- |
| `sipp_manager.sh` | Bash Script | Orchestrator CLI menu, CSV generator, SIPp runner, PID/process tracker, network switcher. | 1,351 | **Port to Python Service Layer** |
| `oxe_remote.py` | Python Script | Automates SSH/Telnet sessions to OXE PBX to deploy and execute user provisioning scripts using `pexpect`. | 169 | **Refactor with OS-Safe Adapter** |
| `sync_watcher.py` | Python Script | Background directory polling daemon syncing scripts to peer server via `rsync`. | 116 | **Refactor to Native Sync Service** |
| `sipp_config.conf` | Configuration | Environment variables defining IP addresses, ports, ranges, authentication credentials, and flags. | 148 | **Migrate to JSON/Database Profiles** |
| `create_sip_users.sh` | OXE Tool Script | Shell script executed remotely on OXE PBX to create SIP subscriber ranges. | 63 | **Retain as Remote Payload** |
| `delete_sip_users.sh` | OXE Tool Script | Shell script executed remotely on OXE PBX to batch delete SIP subscriber ranges. | 54 | **Retain as Remote Payload** |
| `regression_test.py` | Python Script | Standalone 29-test automated regression suite testing config matrix, provisional engine, auth, PRACK, and security. | 665 | **Retain as Core Backend Test Suite** |
| `SIPp_Commands.md` | Documentation | Operational manual, file inventory, quick start guide, PRACK architecture, physical lab checklist. | 536 | **Retain for Reference / User Docs** |
| `INVITE_Caller.xml` | SIPp XML | Baseline unchallenged UAC scenario with SDP audio offer. | 70 | **Core Scenario (Preserve Unchanged)** |
| `INVITE_Called.xml` | SIPp XML | Baseline UAS scenario answering with 180 Ringing and 200 OK. | 50 | **Core Scenario (Preserve Unchanged)** |
| `REGISTER.xml` | SIPp XML | Baseline registration scenario without authentication. | 25 | **Core Scenario (Preserve Unchanged)** |
| `REGISTER_Caller.xml` | SIPp XML | Legacy caller registration scenario. | 25 | **Core Scenario (Preserve Unchanged)** |
| `REGISTER_Called.xml` | SIPp XML | Legacy callee registration scenario. | 25 | **Core Scenario (Preserve Unchanged)** |
| `INVITE_Caller_publish.xml`| SIPp XML | Baseline UAC scenario sending SIP PUBLISH (vq-rtcpxr) after BYE. | 86 | **Core Scenario (Preserve Unchanged)** |
| `REGISTER_Auth.xml` | SIPp XML | Authenticated registration handling 401/407 digest challenge. | 63 | **Core Scenario (Preserve Unchanged)** |
| `INVITE_Caller_Auth.xml` | SIPp XML | Authenticated UAC handling 401/407 challenges, branch preservation, retried INVITE, rejection ACKs. | 185 | **Core Scenario (Preserve Unchanged)** |
| `INVITE_Caller_PRACK.xml`| SIPp XML | Hardened UAC handling reliable/unreliable 180/183, dynamic RSeq/Require validation, CSeq management, and PRACK errors. | 302 | **Core Scenario (Preserve Unchanged)** |
| `INVITE_Caller_Auth_PRACK.xml` | SIPp XML | Dedicated combined UAC handling 401/407 challenge + reliable 180/183 provisional + PRACK (`RAck: <RSeq> 2 INVITE`). | 442 | **Core Scenario (Preserve Unchanged)** |
| `INVITE_Called_PRACK.xml`| SIPp XML | Reliable UAS scenario issuing 183 with `100rel`, preserving proxy `Record-Route`, and isolating INVITE CSeq from PRACK. | 122 | **Core Scenario (Preserve Unchanged)** |
| `*.csv` (8 files) | Static CSVs | Pre-generated caller/called subscriber injection files for LAN and WAN nodes. | ~15 ea | **Generated Dynamically by Backend** |

---

## 3. CLI Menu Mapping to Web Application Features

The current `sipp_manager.sh` script exposes 17 interactive options. The table below maps each CLI option to its architectural destination in the modern web application:

| CLI Option | Name in `sipp_manager.sh` | Existing CLI Responsibility | Target Web Application Component | Web Application Service / API |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Generate CSVs | Builds `REG_CALLER.csv`, `REG_CALLED.csv`, and `CALL_CALLER.csv` based on active mode. | **Environment / Preflight Service** | `POST /api/environments/{id}/generate-csv` |
| **2** | Run Registration | Resolves `REG_XML`, binds IP, launches background SIPp registration. | **Scenario Execution Engine** | `POST /api/executions` (`scenario: "REGISTER"`) |
| **3** | Run Basic Call | Resolves `UAC_XML` or `UAS_XML`, executes traffic generation run. | **Scenario Execution Engine** | `POST /api/executions` (`scenario: "INVITE"`) |
| **4** | Run All | Runs registration, sleeps, then triggers basic call sequentially. | **Test Suite / Workflow Runner** | `POST /api/workflows/run-all` |
| **5** | Check Status | Reads `.sipp.pids`, checks `kill -0`, queries SIPp UDP screen stats. | **Live Monitoring / System Health** | `GET /api/system/status` & WebSocket stream |
| **6** | Stop All SIPp | Sends `SIGTERM` / `SIGKILL` to tracked PIDs, clears PID tracking. | **Execution Control** | `POST /api/executions/{id}/stop` or `POST /api/executions/stop-all` |
| **7** | Show Configuration | Prints masked terminal view of active settings and operating mode. | **Environment Management Dashboard**| `GET /api/environments/{id}` |
| **8** | Edit Configuration | Launches nano/vi on `sipp_config.conf`. | **Settings / Environment Editor UI** | `PUT /api/environments/{id}` |
| **9** | Switch Network | Toggles `NETWORK=LAN` <-> `WAN`, recalculates IPs and re-sources CSVs. | **Environment Profile Switcher** | Dropdown profile selector in web topbar |
| **10** | Toggle Debug Trace | Toggles `-trace_msg -trace_err -trace_calldebug -trace_logs -nd`. | **Test Configuration Parameter** | Checkbox toggle on Scenario Run modal |
| **11** | Toggle PUBLISH | Toggles `PUBLISH_ENABLED`, switching between `INVITE_Caller` & `_publish`. | **Scenario Parameter / Catalog Filter** | Scenario Parameter or dedicated catalog item |
| **12** | Deploy Scripts to OXE | Invokes `python3 oxe_remote.py deploy` using environment credentials. | **PBX Management Node View** | `POST /api/pbx/deploy-scripts` |
| **13** | Create Users on OXE | Invokes `oxe_remote.py run` with `create_sip_users.sh`. | **Subscriber Provisioning Modal** | `POST /api/pbx/create-subscribers` |
| **14** | Delete Users on OXE | Invokes `oxe_remote.py run` with `delete_sip_users.sh`. | **Subscriber Provisioning Modal** | `POST /api/pbx/delete-subscribers` |
| **15** | Sync / Auto-sync | Manual `rsync` or daemonizes `sync_watcher.py`. | **Peer Synchronization Manager** | `POST /api/sync/peer` or background sync agent |
| **16** | Toggle Authentication | Toggles `AUTH_ENABLED=0|1`, recalculates XML and CSV generation. | **Mode / Security Configuration** | Test Configuration Parameter |
| **17** | Toggle PRACK / 100rel | Toggles `PRACK_ENABLED=0|1`, recalculates XML and CSV generation. | **Mode / Protocol Configuration** | Test Configuration Parameter |

---

## 4. Current Test Coverage & Verification Evidence

An audit of `regression_test.py` and the committed scenarios reveals exact boundaries between what is verified and what remains untested:

| Verification Area | Actual Tested Scope | Test Method | Test Status |
| :--- | :--- | :--- | :---: |
| **4 Operating Modes** | Modes (0,0), (1,0), (0,1), (1,1) scenario selection logic. | Synthetic Subprocess & bash script | **VERIFIED (Software)** |
| **Provisional Engine** | 180/183 reliable, unreliable, repeated, alternating, direct 200 OK. | Synthetic Python UDP Mock Server | **VERIFIED (Software)** |
| **Negative Provisional** | Missing RSeq, malformed RSeq, missing Require, malformed Require. | Synthetic Python UDP Mock Server | **VERIFIED (Software)** |
| **PRACK Failure Cases** | PRACK 481, 500, 503 rejections, timeout routing. | Synthetic Python UDP Mock Server | **VERIFIED (Software)** |
| **Authentication Flows** | REGISTER 401/407, INVITE 407 challenge, 486 busy rejection ACK. | Synthetic Python UDP Mock Server | **VERIFIED (Software)** |
| **Combined Auth + PRACK** | 407/401 challenge -> retried INVITE -> reliable provisional -> PRACK. | Synthetic Python UDP Mock Server | **VERIFIED (Software)** |
| **UAS Route & CSeq** | Upstream proxy Record-Route preservation, INVITE CSeq isolation. | Synthetic Python UDP Client | **VERIFIED (Software)** |
| **Security & Portability** | Password console masking, CSV chmod 600, zero hardcoded paths. | Static Code Audit & regex parsing | **VERIFIED (Software)** |
| **Physical OXE Registration** | Real SIP registration with Alcatel-Lucent OmniPCX Enterprise PBX. | Physical Lab SIP trunk (`172.19.112.51`) | **NOT TESTED (Awaiting Lab)** |
| **Physical OXE Call Routing** | Real 2-party and multi-party calls through OXE SIP engine. | Physical Lab PBX (`172.19.112.51`) | **NOT TESTED (Awaiting Lab)** |
| **Physical OXE Provisioning** | Actual creation/deletion of users via remote OXE `mgr` script. | Physical Lab PBX via SSH/Telnet | **NOT TESTED (Awaiting Lab)** |

---

## 5. Linux-Specific Assumptions & Windows Obstacles

During the codebase inspection, several Linux-specific assumptions were identified that would fail on Windows if not abstracted:

1. **`pexpect.spawn` in `oxe_remote.py`**:
   - `pexpect.spawn` is not implemented on Windows (`AttributeError: module 'pexpect' has no attribute 'spawn'`).
   - On Windows, `pexpect` only supports `pexpect.popen_spawn.PopenSpawn`, which lacks raw pseudo-terminal (pty) semantics necessary for interactive telnet control.
   - *Requirement*: Create a platform-agnostic remote connection adapter using standard SSH/Paramiko or a native Python telnet/socket client.
2. **`rsync` Dependency in `sync_watcher.py` & `sipp_manager.sh`**:
   - `rsync` is a POSIX utility that does not exist natively on Windows.
   - *Requirement*: Implement a pure Python file synchronization service (using file hashing, timestamps, and HTTP/WebSocket or Paramiko SFTP transfer).
3. **Bash Shell Scripting (`sipp_manager.sh`)**:
   - `sipp_manager.sh` relies on Bash parameter expansions, `eval`, `ps`, `kill -0`, and Linux `/proc`. It cannot run natively on Windows Command Prompt or PowerShell without WSL or Cygwin.
   - *Requirement*: Move all management logic (scenario resolution, PID tracking, command construction, CSV generation) into Python backend services.
4. **SIPp Process Management**:
   - The CLI relies on `-bg` (background daemon mode) and extracts PIDs via stdout regex `PID is [0-9]+`.
   - Windows native executables and WSL handle process IDs and backgrounding differently.
   - *Requirement*: Use Python's `subprocess.Popen` with process group IDs (`creationflags=subprocess.CREATE_NEW_PROCESS_GROUP` on Windows, `start_new_session=True` on Linux) to track, inspect, and cleanly terminate SIPp processes without shell dependencies.

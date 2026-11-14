# SIPp Test Toolkit

Menu-driven SIPp harness for load-testing an OXE PBX from two SIPp servers, each with two network interfaces (Internal LAN + Isolated WAN).

## Status

**Validated on 2026-07-28** against OXE R101.1 n4.205.36 (`sip-120-main`, node121):

- REGISTER — 20 users × 2 sides (55001–55010 caller, 55011–55020 callee), all 200 OK, bindings visible in `dspSIPExt`.
- Basic Call — INVITE → 180 → 200 + SDP → ACK → BYE → 200 on the LAN network. No `CProxyCall` transit path; `isUserInDico` hits on both sides.

Configuration used: `NETWORK=LAN`, `TRANSPORT=u1`, `DEBUG_TRACE=0`. XMLs use `[transport]` and endpoint-per-user URI domains (`field2`=CALLER_IP, `field3`=CALLED_IP) — see the CSV-format section below for why that matters.

## Topology

| Role | Internal LAN | Isolated WAN | Login | Password |
|------|--------------|--------------|-------|----------|
| CALLER  | 172.19.112.50 | 192.168.1.8  | root | root@123 |
| CALLED  | 172.19.112.60 | 192.168.1.7  | root | root@123 |
| Server3 | 172.19.112.65 | 192.168.1.17 | root | root@123 |
| OXE     | 172.19.5.121  | 192.168.1.51 | —    | —        |

Which network is used per run is driven by `NETWORK=LAN|WAN` in `sipp_config.conf` (or via **menu option 9** at runtime). CSV files are suffixed `_<NETWORK>_node<N>` where `<N>` is the last octet of the active OXE IP (e.g. `172.19.5.121` → `node121`, `192.168.1.51` → `node51`) so CSVs for different networks *and* different testbed nodes coexist on disk without collision.

## Script paths & Peer Deployment

Paths are configurable in `sipp_config.conf` via `PEER_SCRIPT_DIR` (or `PEER_SCRIPT_DIR_ON_CALLER` / `PEER_SCRIPT_DIR_ON_CALLED`). If left unset, the manager dynamically uses the current script directory (`$SCRIPT_DIR`).

Reference testbed deployment paths:
```
CALLER  -> /root/praveen/SIPP/SIPP_CALLER_Scripts  (or custom directory)
CALLED  -> /root/praveen/SIPP/SIPP_CALLED_Scripts  (or custom directory)
```

## User ranges (current config)

| Role   | QMCDU range   |
|--------|---------------|
| CALLER | 55001 – 55010 |
| CALLED | 55011 – 55020 |

---

## Files in this toolkit

| File | Purpose | Deploy on |
|------|---------|-----------|
| `sipp_config.conf`      | Single source of truth (IPs, ranges, ports, transport, peer dirs) | both |
| `sipp_manager.sh`       | Menu-driven launcher & orchestrator | both |
| `REGISTER.xml`          | Unified REGISTER UAC scenario (used by both sides) | both |
| `REGISTER_Caller.xml`   | Legacy REGISTER UAC scenario (retained for backward compatibility) | CALLER |
| `REGISTER_Called.xml`   | Legacy REGISTER UAC scenario (retained for backward compatibility) | CALLED |
| `REGISTER_Auth.xml`     | Authenticated REGISTER scenario (handles 401/407 challenges, MD5 digest, RFC 3665 no-ACK). Selected when `AUTH_ENABLED=1` (menu **16**). | both |
| `INVITE_Caller.xml`         | Basic-call UAC (INVITE → ACK → pause → BYE → 200) | CALLER |
| `INVITE_Caller_publish.xml` | Same as above, plus a PUBLISH (vq-rtcpxr, MOS 4.2) to OXE after BYE — for VoIP-Metrics-Collector testing. Selected when `PUBLISH_ENABLED=1` (menu **11**). | CALLER |
| `INVITE_Caller_Auth.xml`    | Authenticated UAC scenario (handles 401/407 challenges, Via branch isolation, CSeq matching, 486 rejection handling). Selected when `AUTH_ENABLED=1` (menu **16**). | CALLER |
| `INVITE_Caller_PRACK.xml`   | Reliable provisional UAC scenario (180/183, Require: 100rel validation, RSeq extraction, RAck generation). Selected when `PRACK_ENABLED=1` (menu **17**). | CALLER |
| `INVITE_Called.xml`         | Basic-call UAS (180 → 200+SDP → BYE 200) — no CSV needed | CALLED |
| `INVITE_Called_PRACK.xml`   | Reliable provisional UAS scenario (sends 183 with Require: 100rel and RSeq: 101, awaits PRACK, answers call). Selected when `PRACK_ENABLED=1` (menu **17**). | CALLED |
| `oxe_remote.py`         | OXE SSH/telnet provisioning agent | both |
| `sync_watcher.py`       | Auto-sync daemon syncing scripts, configs, and XMLs | both |
| `create_sip_users.sh`   | OXE batch subscriber creation tool | both |
| `delete_sip_users.sh`   | OXE batch subscriber deletion tool | both |
| `REGISTER_Caller_{LAN,WAN}_node<N>.csv` | Caller registration data, per network | CALLER (generated) |
| `REGISTER_Called_{LAN,WAN}_node<N>.csv` | Called registration data, per network | CALLED (generated) |
| `INVITE_Caller_{LAN,WAN}_node<N>.csv`   | Caller ↔ callee call pairs, per network | CALLER (generated) |
| `archive/`              | Historical/reference assets (`INVITE.xml`, `delete_batch.py`, `caller_invite.csv`, `Motor_40884_finalHF.txt`) | reference |

All XMLs use SIPp's `[transport]` placeholder in `Via:` and `Contact: transport=`, so the actual protocol follows the `TRANSPORT` value in the config (`u1` UDP / `t1` TCP / `l1` TLS / …) — no XML edits needed to switch transport.

---

## Quick start (recommended path)

**On each server (one-time normalize after copying files from Windows):**
```bash
sed -i 's/\r$//' sipp_config.conf sipp_manager.sh *.xml
chmod +x sipp_manager.sh
```

**Every test run:**
```bash
./sipp_manager.sh
```

Menu:
```
===== SIPp Manager (ROLE / NETWORK) =====
  1) Generate CSVs
  2) Run Registration
  3) Run Basic Call
  4) Run All (Register + Basic Call)
  5) Check Status
  6) Stop All SIPp
  7) Show Configuration
  8) Edit Configuration
  9) Switch Network       [current: LAN]
 10) Toggle Debug Trace   [current: 0]
 11) Toggle PUBLISH       [current: 0]  (VoIP metrics after BYE)
  0) Exit
```

Typical flow: **1** → **2** on both servers → **3** on CALLED first, then **3** on CALLER. Or run **4** on each to do it all in one shot.

The manager auto-detects role by matching `hostname -I` against both LAN and WAN IPs of CALLER/CALLED, so you never have to tell it who you are.

---

## Configuration reference (`sipp_config.conf`)

```bash
# ---- Network selection ----
NETWORK=LAN                   # LAN or WAN

# ---- OXE (Target PBX) ----
OXE_IP_LAN=172.19.5.121
OXE_IP_WAN=192.168.1.51
OXE_PORT=5060

# ---- CALLER SIPp Server ----
CALLER_IP_LAN=172.19.112.50
CALLER_IP_WAN=192.168.1.8
CALLER_RANGE_START=55001
CALLER_RANGE_END=55010
CALLER_REG_PORT=5060
CALLER_CALL_PORT=5065

# ---- CALLED SIPp Server ----
CALLED_IP_LAN=172.19.112.60
CALLED_IP_WAN=192.168.1.7
CALLED_RANGE_START=55011
CALLED_RANGE_END=55020
CALLED_REG_PORT=5060
CALLED_CALL_PORT=5060

# ---- Server3 (spare) ----
SERVER3_IP_LAN=172.19.112.65
SERVER3_IP_WAN=192.168.1.17

# ---- Test Parameters ----
REG_COUNT=20
REG_RATE=5
CALL_COUNT=100
CALL_RATE=2

# ---- Transport (XMLs use [transport]) ----
TRANSPORT=u1                  # u1|un|t1|tn|l1

# ---- Debug trace ----
DEBUG_TRACE=0                 # 1 to add -trace_msg -trace_err -trace_calldebug -trace_logs -nd

# ---- PUBLISH VoIP metrics after BYE ----
PUBLISH_ENABLED=0             # 1 to use INVITE_Caller_publish.xml (adds vq-rtcpxr PUBLISH to OXE)
```

### Switching network
- **Persistent:** set `NETWORK=WAN` in the config.
- **Session-only:** menu option **9** flips LAN↔WAN. On switch the manager also verifies the corresponding bind IP is actually up on this host.

### Switching transport
Just change `TRANSPORT`. Because the XMLs use `[transport]`, the `Via:` and `Contact: transport=` fields follow automatically.

### PUBLISH / VoIP metrics
For testing OXE's VoIP-Metrics-Collector feature, flip `PUBLISH_ENABLED=1` (or menu **11**). The manager then selects `INVITE_Caller_publish.xml` instead of `INVITE_Caller.xml`. The scenario is identical up to the BYE 200 OK, then adds:

```
PUBLISH sip:[field2]:[field3]                    ← OXE_IP:OXE_PORT (from CSV)
From:  <sip:[field0]@[field2]:[field3]>          ← user@OXE:port
To:    <sip:[field0]@[field2]:[field3]>          ← user@OXE:port
Call-ID: [call_id]                                ← same as the INVITE
CSeq:  3 PUBLISH
Contact: <sip:[field0]@[local_ip]:[local_port];transport=[transport]>
Event: vq-rtcpx
Content-Type: application/vq-rtcpx

<VoIPMetrics>
  <CallID>...</CallID>
  <LocalMetrics><MOS>4.2</MOS></LocalMetrics>
</VoIPMetrics>
```

All identity URIs (Request-URI, From, To) target OXE using the same `field2:field3` as the INVITE — matches the reference trace in `Motor_40884_finalHF.txt`. On the OXE side, `CVqrCollectorCall::onReceivePublishRequest` picks up the vq-rtcpxr event and persists it (`CVqrCollector::writeRecord`). Provided the preceding INVITE ran cleanly through `CMotorCall` (subscriber found in dictionary, BYE closed the session), OXE treats this PUBLISH — despite sharing the INVITE's Call-ID — as a fresh session dispatched to the collector, not a continuation of a proxy call.

---

## CSV formats

The manager (**menu 1**) generates all CSVs from the config — no manual editing needed. Fields match the placeholders in the XMLs.

**`REGISTER_Caller_<NET>.csv` / `REGISTER_Called_<NET>.csv`** — used by `REGISTER_*.xml`:
```
SEQUENTIAL;field0;field1
<QMCDU>;<OXE_IP>
```

**`INVITE_Caller_<NET>_node<N>.csv`** — used by `INVITE_Caller.xml` and `INVITE_Caller_publish.xml`:
```
SEQUENTIAL;field0;field1;field2;field3
<CALLER_QMCDU>;<CALLEE_QMCDU>;<OXE_IP>;<OXE_PORT>
```

**Why `field2` = OXE_IP and `field3` = OXE_PORT** (reference convention, matches `Motor_40884_finalHF.txt`): OXE keys its CH subscriber dictionary by `<number>@<OXE_IP>`. The Request-URI / From / To all use the OXE address so `isUserInDico` finds the subscriber, `CMotorCall::analyseRouting` returns `authenticable`, and the call enters the proper CH path (`CMotorCall`, not `CProxyCall`). OXE then finds the endpoint's real location from the SIP-registrar Contact binding (CALLER_IP for the caller, CALLED_IP for the callee) and routes accordingly.

If you use CALLER_IP / CALLED_IP here instead, `isUserInDico` fails → `CMotorCall` gives up → `CProxyCall` takes over → you get the "two 100 Trying, no 180" pattern followed by a proxy loop until Max-Forwards decays. **Always OXE_IP:OXE_PORT for these fields.**

`INVITE_Called.xml` needs no CSV — it answers any incoming INVITE.

If the CALLER range is wider than the CALLED range, the callee side wraps: caller 55011 pairs to callee 55011 first, then wraps around when it exceeds `CALLED_RANGE_END`.

---

## Raw SIPp commands (equivalent to what the manager runs)

The manager just wraps these. Values below reflect `NETWORK=LAN` with the current config.

### Registration

**CALLER (172.19.112.50):**
```bash
./sipp -sf REGISTER_Caller.xml -inf REGISTER_Caller_LAN_node121.csv \
       -i 172.19.112.50 -p 5060 -t u1 -m 20 -r 5 -aa \
       172.19.5.121:5060
```

**CALLED (172.19.112.60):**
```bash
./sipp -sf REGISTER_Called.xml -inf REGISTER_Called_LAN_node121.csv \
       -i 172.19.112.60 -p 5060 -t u1 -m 20 -r 5 -aa \
       172.19.5.121:5060
```

Wait for both registrations to complete before starting basic call.

### Basic Call — **start CALLED first**

**CALLED (172.19.112.60) — UAS, no CSV, no remote host:**
```bash
./sipp -sf INVITE_Called.xml \
       -i 172.19.112.60 -p 5060 -t u1 -m 100 -aa
```

**CALLER (172.19.112.50):**
```bash
./sipp -sf INVITE_Caller.xml -inf INVITE_Caller_LAN_node121.csv \
       -i 172.19.112.50 -p 5065 -t u1 -m 100 -r 2 -aa \
       172.19.5.121:5060
```

### With debug traces

Set `DEBUG_TRACE=1` in the config (or hit menu **10**), and every launch gets:
```
-trace_msg -trace_err -trace_calldebug -trace_logs -nd
```

Trace files land in the current working directory alongside the CSVs.

---

## Parameter reference

| Flag | Meaning |
|------|---------|
| `-sf`                | Scenario XML |
| `-inf`               | CSV injection file (`SEQUENTIAL` header + rows) |
| `-i`                 | Local bind IP (must be one of this host's IPs) |
| `-p`                 | Local SIP port |
| `-t`                 | Transport: `u1` (UDP-per-call), `un` (UDP single), `t1`/`tn` (TCP), `l1`/`ln` (TLS) |
| `-m`                 | Max calls |
| `-r`                 | Call rate per second |
| `-aa`                | Auto-answer (SIPp auto-200's certain requests) |
| `-bg`                | Run detached in background |
| `-trace_msg`         | Log every SIP message |
| `-trace_err`         | Log errors |
| `-trace_calldebug`   | Per-call debug log |
| `-trace_logs`        | General logs |
| `-nd`                | No default behaviour — required by SIPp when custom logs are enabled |

Remote host argument (`<OXE_IP>:<OXE_PORT>`) is the destination SIPp routes to. For UAS scenarios (`INVITE_Called.xml`), it's omitted — the script only listens.

---

## Troubleshooting

**`$'\r': command not found` when sourcing the config**
Windows CRLF endings. The manager tolerates them (sources through `sed 's/\r$//'`), but if you see this elsewhere:
```bash
sed -i 's/\r$//' sipp_config.conf sipp_manager.sh *.xml
```

**`WARNING: bind IP X is not on this host`**
The selected `NETWORK`'s IP isn't up on this server. Either bring the interface up or switch network (option **9**).

**SIPp binds but no traffic reaches OXE**
Confirm OXE is reachable on the network you selected:
```bash
ping <OXE_IP>            # from the SIPp serve
```
Then check the trunk config on OXE side (routing table, SIP profile, ACL for the SIPp IP).

**CALLER's INVITEs get 486/487 immediately**
CALLED-side UAS isn't listening yet. Start CALLED (option **3**) BEFORE CALLER, or use option **4** (`Run All`) which orders them correctly.

**Registrations time out**
Check that the OXE has the QMCDUs provisioned in the caller/callee range and the SIP trunk permits registration from the SIPp IP. Enable `DEBUG_TRACE=1` to see the actual REGISTER/response exchange.

**INVITE succeeds at SIPp but OXE routes it as a proxy (call loops back to OXE and dies)** *— resolved in the shipped XMLs; keep here as reference in case CSVs get regenerated with a stale generator.*
Symptom in the OXE trace:
```
[isUserInDico] looking for 55001@<OXE_IP> ... NOT found in the dictionnary.
[CMotorCall::toGatewayOrProxy] SIP_PRIVATE_TRANSIT_MODE=1.
[CCallManager::onIncomingRequest] E_MGR_NOT_AFFECTED, kill session
[CProxyCall::onReceiveRequest] receive request without resolution
SEND MESSAGE TO NETWORK (<OXE_IP>:5060 [UDP]) ... INVITE sip:55011@<OXE_IP>:5060 ...
```
OXE keys SIP subscribers by `<num>@<provisioned IP>`, where the provisioned IP is what `dspSIPExt` shows in the "IP Address" column — the SIPp endpoint's IP, not OXE's. The From URI must be `sip:<caller>@<CALLER_IP>` and the Request-URI / To must be `sip:<callee>@<CALLED_IP>`. The current `INVITE_Caller.xml` + `INVITE_Caller_<NET>_node<N>.csv` do this — but if you had older CSVs from before this fix (with OXE_IP:OXE_PORT in fields 2/3), regenerate them (menu option **1**).

---

## Phase 3A: SIP Protocol Hardening (Authentication & PRACK/100rel)

Phase 3A introduces validated SIP protocol hardening features without altering the baseline OXE production flows. All hardening features are modular, isolated in dedicated scenarios, and controlled via configuration flags or interactive menu toggles.

### 1. Configuration Options (`sipp_config.conf`)

| Parameter | Default | Values | Purpose |
|:---|:---:|:---:|:---|
| `AUTH_ENABLED` | `0` | `0` (off) / `1` (on) | Toggles authenticated scenarios (`REGISTER_Auth.xml` and `INVITE_Caller_Auth.xml`). Menu option **16**. |
| `AUTH_PASSWORD` | `"secret"` | string | Shared secret or subscriber password used for MD5 challenge authorization. |
| `PRACK_ENABLED` | `0` | `0` (off) / `1` (on) | Toggles reliable provisional response scenarios (`INVITE_Caller_PRACK.xml` and `INVITE_Called_PRACK.xml`). Menu option **17**. |

### 2. Authentication Architecture

- **REGISTER Authentication (`REGISTER_Auth.xml`)**:
  - Handles initial unauthenticated `REGISTER` (`CSeq: 1 REGISTER`).
  - Catches `401 Unauthorized` (and upstream `407 Proxy Authentication Required`) with `auth="true"`.
  - Strictly adheres to **RFC 3665 §2.1** and **RFC 3261 §10.2**: transmits **NO ACK** for non-INVITE challenge responses.
  - Automatically retransmits authenticated `REGISTER` with `CSeq: 2 REGISTER`, a fresh Via branch, and computed MD5 Digest Authorization (`[field2]`).
  - Supports direct 200 OK responses when no challenge is issued by OXE.

- **INVITE Authentication (`INVITE_Caller_Auth.xml`)**:
  - Transmits initial `INVITE` (`CSeq: 1 INVITE`).
  - Intercepts `401 Unauthorized` or `407 Proxy Authentication Required`.
  - **Via Branch Isolation**: Uses regex `<ereg regexp="branch=[^; \r\n]+" search_in="hdr" header="Via:" assign_to="1"/>` to capture only the top UAC Via branch. Reconstructs a single clean `Via` in the non-2xx ACK, completely avoiding duplicate Via header concatenation when traversing multi-hop proxy routes.
  - **Transaction CSeq Matching**: Non-2xx ACK uses `CSeq: 1 ACK` to acknowledge the initial transaction.
  - **Authenticated INVITE Retry**: Transmits authenticated `INVITE` with `CSeq: 2 INVITE`, brand-new Via branch, and computed Digest Authorization (`[field4]`).
  - **Rejection Handling**: If the authenticated call receives a 486 Busy Here, 401 retry failure, 404, or 503, the scenario sends a non-2xx ACK matching `CSeq: 2 ACK` and the retried Via branch, then exits cleanly.
  - **2xx ACK**: Per RFC 3261 §17.1.1.3, the final 2xx ACK for a successful dialog uses a fresh branch ID and matches `CSeq: 2 ACK`.
  - **BYE**: In-dialog session termination uses `CSeq: 3 BYE`.

### 3. CSV Formats for Authentication

To avoid SIPp nested-bracket parsing errors (`[authentication username=[field0] ...]` is rejected by SIPp's parser), the manager dynamically embeds the complete authentication directive into the CSV injection file when `AUTH_ENABLED=1`:

- **Registration CSV (`REGISTER_Caller_<NET>_node<N>.csv`)**:
  ```text
  SEQUENTIAL;field0;field1;field2
  55001;172.19.5.121;[authentication username=55001 password=secret]
  55002;172.19.5.121;[authentication username=55002 password=secret]
  ```
- **Call CSV (`INVITE_Caller_<NET>_node<N>.csv`)**:
  ```text
  SEQUENTIAL;field0;field1;field2;field3;field4
  55001;55011;172.19.5.121;5060;[authentication username=55001 password=secret]
  55002;55012;172.19.5.121;5060;[authentication username=55002 password=secret]
  ```
When `AUTH_ENABLED=0` (default), standard 2-field and 4-field baseline CSVs are generated.

### 4. PRACK / 100rel Architecture

- **Caller Scenario (`INVITE_Caller_PRACK.xml`)**:
  - Advertises `Supported: 100rel` in the initial INVITE.
  - Inspects provisional response (`183 Session Progress` or `180 Ringing`):
    - Validates `Require: 100rel` using `<strcmp>`.
    - Validates numeric `RSeq` using regex `[0-9]+` and `<strcmp>`.
    - Captures `CSeq` number.
  - When reliable: transmits `PRACK [next_url]` with `RAck: <RSeq> <CSeq> INVITE` and monotonic `CSeq: [cseq] PRACK`. Awaits PRACK 200 OK before proceeding.
  - When unreliable (or 100rel absent): cleanly jumps to the direct dialog path without blocking.
  - Preserves OXE-specific addressing (`sip:[field1]@[field2]:[field3]`).
- **Called Scenario (`INVITE_Called_PRACK.xml`)**:
  - Receives incoming INVITE.
  - Transmits 183 Session Progress with `Require: 100rel` and `RSeq: 101`.
  - Awaits incoming PRACK, responds with 200 OK to PRACK.
  - Answers with 200 OK to INVITE, awaits ACK, awaits BYE, responds 200 OK.

### 5. CSeq Behavior & SIPp Engine Requirements

- **Minimum Verified SIPp Version**: **SIPp v3.7.7** (compiled with TLS, PCAP, SCTP, SHA256).
- **Monotonic Progression**: Verified that native `[cseq]` automatically produces clean integer values across discrete requests:
  - Without PRACK: `CSeq: 1 INVITE` → `CSeq: 1 ACK` → `CSeq: 2 BYE`.
  - With PRACK: `CSeq: 1 INVITE` → `CSeq: 2 PRACK` → `CSeq: 1 ACK` → `CSeq: 3 BYE`.
  - With Authentication: `CSeq: 1 INVITE` → `CSeq: 1 ACK` → `CSeq: 2 INVITE` → `CSeq: 2 ACK` → `CSeq: 3 BYE`.
- **Floating-Point Arithmetic Hazard**: Never use `<add assign_to="var" value="1"/>` to format CSeq headers; SIPp casts arithmetic variables to floating point (`2.000000`), generating malformed SIP headers.

### 6. Execution & Rollback Instructions

- **To run with Authentication**:
  - Interactive: Run `./sipp_manager.sh`, select **16** to toggle Auth ON (or set `AUTH_ENABLED=1` in `sipp_config.conf`), then select **1** (Generate CSVs), and run **2** (Register) or **3** (Basic Call).
- **To run with PRACK**:
  - Interactive: Run `./sipp_manager.sh`, select **17** to toggle PRACK ON (or set `PRACK_ENABLED=1` in `sipp_config.conf`), start CALLED host first, then start CALLER.
- **Rollback to Baseline OXE Behavior**:
  - Set `AUTH_ENABLED=0` and `PRACK_ENABLED=0` in `sipp_config.conf` (or toggle 16 and 17 off in `./sipp_manager.sh`).
  - Regenerate CSVs with option **1**. The system immediately returns to baseline `REGISTER.xml` and `INVITE_Caller.xml`.
  - To discard all Phase 3A branch changes: `git checkout main`.

### 7. Known Limitations

- **Physical Lab Accessibility**: Remote physical hosts `172.19.112.50` (CALLER) and `172.19.112.60` (CALLED) remain unreachable over SSH/LAN. All tests are validated against local synthetic SIP engines running SIPp v3.7.7.
- **Multiple Provisional Looping**: SIPp's execution model is a linear state engine. Dynamic looping over an arbitrary, unknown number of provisional responses without a terminal condition causes engine stalls; advanced arbitrary looping remains deferred.

---

## File deployment cheatsheet

**Common files on BOTH hosts:**
```
sipp                        (binary)
sipp_config.conf            (central configuration)
sipp_manager.sh             (menu orchestrator)
REGISTER.xml                (unified baseline registration scenario)
REGISTER_Auth.xml           (authenticated registration scenario)
REGISTER_Caller.xml         (legacy caller registration scenario - optional fallback)
REGISTER_Called.xml         (legacy callee registration scenario - optional fallback)
oxe_remote.py               (OXE provisioning agent)
sync_watcher.py             (peer synchronization daemon)
create_sip_users.sh         (OXE user creation script)
delete_sip_users.sh         (OXE user deletion script)
```

**CALLER host scenarios:**
```
INVITE_Caller.xml           (baseline UAC scenario)
INVITE_Caller_Auth.xml      (authenticated UAC scenario)
INVITE_Caller_PRACK.xml     (reliable provisional PRACK UAC scenario)
INVITE_Caller_publish.xml   (only needed if you use PUBLISH_ENABLED=1)
```

**CALLED host scenarios:**
```
INVITE_Called.xml           (baseline UAS scenario)
INVITE_Called_PRACK.xml     (reliable provisional PRACK UAS scenario)
```

**Archived reference assets (`archive/` folder):**
```
INVITE.xml                  (legacy UDP-only scenario)
delete_batch.py             (legacy telnet script)
caller_invite.csv           (legacy static CSV)
Motor_40884_finalHF.txt     (OXE SIP motor reference trace)
```

CSVs are generated locally by the manager — don't hand-copy the samples.

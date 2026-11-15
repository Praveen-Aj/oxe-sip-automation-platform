# OXE SIP Domain & Protocol Invariants

## 1. Domain Responsibility
This document defines the enterprise SIP signaling rules, proprietary OmniPCX Enterprise (OXE) routing conventions, and transaction integrity requirements across all automation tools, runners, and scenarios.

## 2. Invariant Rules

### 1. Request-URI & Address Construction
- OXE addresses subscribers by `<subscriber>@<OXE_IP>:<OXE_PORT>`.
- Contact headers MUST specify the local transport endpoint: `<sip:[user]@[local_ip]:[local_port];transport=[transport]>`.
- Dynamic parameters must be substituted exclusively via injection variables:
  - `field0` = caller extension
  - `field1` = callee extension
  - `field2` = OXE IP address
  - `field3` = OXE SIP port (default: 5060)
  - `field4` = digest authentication line

### 2. Authentication Handling (401 / 407 Challenges)
- Initial INVITE uses `CSeq: 1 INVITE`.
- On `401 Unauthorized` or `407 Proxy Authentication Required`, the UAC sends a non-2xx `ACK` with `CSeq: 1 ACK` preserving the *original top-Via branch*.
- Retried INVITE must increment CSeq to `CSeq: 2 INVITE`, generate a fresh transaction branch, and append `[field4]` credentials.
- Non-2xx rejections to the retried INVITE (e.g. 486 Busy) must issue an ACK with `CSeq: 2 ACK` matching the retried branch.

### 3. Reliable Provisional Responses (RFC 3262 / PRACK / 100rel)
- Initial INVITE must advertise `Supported: 100rel`.
- Provisional responses (180/183) trigger PRACK only when `Require: 100rel` token is detected and a strictly numeric `RSeq:` is parsed.
- `RAck:` header must strictly mirror `<RSeq> <INVITE_CSeq> INVITE`.
- Intervening PRACK requests must use an independent monotonic CSeq (e.g. `CSeq: 3 PRACK` if retried INVITE was CSeq 2).
- The subsequent 2xx ACK must mirror the original INVITE CSeq (`CSeq: 2 ACK`), and BYE must increment monotonically (`CSeq: 4 BYE`).

### 4. Record-Route Preservation
- Proxies (such as OXE or ABC-F nodes) insert upstream `Record-Route` headers.
- The UAS scenario (`INVITE_Called_PRACK.xml`) must extract and mirror `Record-Route` from the incoming INVITE into both provisional (183) and 200 OK responses, without corruption from intervening PRACK requests.

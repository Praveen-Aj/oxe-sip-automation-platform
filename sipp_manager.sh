#!/bin/bash
########################################
#  SIPp Manager - Menu-driven tool
#  Edit sipp_config.conf, then run this.
#
#  Two-LAN topology (each server has BOTH interfaces):
#                     Internal LAN     Isolated WAN
#    CALLER  server:  172.19.112.50    192.168.1.8
#    CALLED  server:  172.19.112.60    192.168.1.7
#    Server3 (spare): 172.19.112.65    192.168.1.17
#
#  NETWORK=LAN|WAN in sipp_config.conf picks which side is active.
#  Generated CSVs are suffixed _LAN / _WAN so both sets coexist.
#
#  Scenarios (all XMLs use [transport] - protocol follows TRANSPORT):
#    REGISTER_Caller.xml + REGISTER_Caller_<NET>.csv
#    REGISTER_Called.xml + REGISTER_Called_<NET>.csv
#    INVITE_Caller.xml   + INVITE_Caller_<NET>.csv
#    INVITE_Called.xml   (no CSV - UAS answers whatever comes in)
########################################

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/sipp_config.conf"
ROLE=""

# ---- XML scenario file names ----
REG_XML_UNIFIED="REGISTER.xml"
REG_CALLER_XML="REGISTER_Caller.xml"
REG_CALLED_XML="REGISTER_Called.xml"
REG_XML="${REG_XML_UNIFIED}"   # resolved dynamically by select_reg_xml()
UAC_XML_PLAIN="INVITE_Caller.xml"
UAC_XML_PUBLISH="INVITE_Caller_publish.xml"
UAC_XML="${UAC_XML_PLAIN}"   # resolved dynamically by select_uac_xml()
UAS_XML="INVITE_Called.xml"

# ---- Trace flags (added when DEBUG_TRACE=1) ----
TRACE_FLAGS="-trace_msg -trace_err -trace_calldebug -trace_logs -nd"

# ---- Colors ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ---- Process Management & Logging Files ----
PID_FILE="${SCRIPT_DIR}/.sipp_managed.pids"
EXEC_LOG="${SCRIPT_DIR}/sipp_execution.log"

log_msg() {
    local level="$1"
    shift
    local msg="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "")
    echo "[${timestamp}] [${level}] [${ROLE:-NO_ROLE}] ${msg}" >> "${EXEC_LOG}" 2>/dev/null
}

resolve_sipp() {
    if [ -f "${SCRIPT_DIR}/sipp" ] && [ -x "${SCRIPT_DIR}/sipp" ]; then
        echo "${SCRIPT_DIR}/sipp"
    elif [ -f "./sipp" ] && [ -x "./sipp" ]; then
        echo "./sipp"
    elif command -v sipp &>/dev/null; then
        command -v sipp
    else
        echo "./sipp"
    fi
}

track_pid() {
    local pid="$1"
    local desc="$2"
    if [ -n "$pid" ]; then
        echo "${pid}:${desc}" >> "${PID_FILE}"
        log_msg "INFO" "Tracked managed PID ${pid} (${desc})"
    fi
}

is_sipp_proc() {
    local pid="$1"
    if [ -d "/proc/${pid}" ]; then
        if grep -q "sipp" "/proc/${pid}/cmdline" 2>/dev/null; then
            return 0
        fi
    fi
    if ps -p "$pid" -o comm= 2>/dev/null | grep -qi "sipp"; then
        return 0
    fi
    return 1
}

get_managed_pids() {
    local active_pids=()
    if [ -f "${PID_FILE}" ]; then
        local tmp_file="${PID_FILE}.tmp"
        > "$tmp_file"
        while IFS=':' read -r pid desc || [ -n "$pid" ]; do
            pid=$(echo "$pid" | tr -d '[:space:]')
            [ -z "$pid" ] && continue
            if kill -0 "$pid" 2>/dev/null && is_sipp_proc "$pid"; then
                active_pids+=("$pid")
                echo "${pid}:${desc}" >> "$tmp_file"
            fi
        done < "${PID_FILE}"
        mv "$tmp_file" "${PID_FILE}"
    fi
    echo "${active_pids[@]}"
}

launch_sipp_bg() {
    local desc="$1"
    shift
    local cmd="$*"

    log_msg "INFO" "Launching background SIPp [${desc}]: ${cmd}"

    local out
    out=$(eval "${cmd}" 2>&1)
    local rc=$?
    log_msg "DEBUG" "Launch command output: ${out}"

    if [ $rc -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to launch SIPp (${desc}), exit code: ${rc}${NC}" >&2
        echo -e "${RED}${out}${NC}" >&2
        log_msg "ERROR" "Failed to launch ${desc} (rc=${rc}): ${out}"
        return $rc
    fi

    # Extract PID from SIPp output (e.g. "Background mode - PID is 12345" or "PID is 12345")
    local pid
    pid=$(echo "$out" | grep -oP '(?:PID is\s*|PID=\s*)\K[0-9]+' | head -n1)
    if [ -z "$pid" ]; then
        pid=$(echo "$out" | grep -iE 'PID|background' | grep -oE '[0-9]+' | tail -n1)
    fi

    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        track_pid "$pid" "$desc"
        log_msg "INFO" "Successfully started ${desc} with PID ${pid}"
        echo "$pid"
        return 0
    else
        echo -e "${RED}ERROR: SIPp reported launch but process PID was not found or not running.${NC}" >&2
        log_msg "ERROR" "SIPp started with -bg but PID ${pid} is not running. Output: ${out}"
        return 1
    fi
}

verify_sipp_results() {
    local pid="$1"
    local scenario="$2"

    local screen_log
    screen_log=$(ls *"${pid}"*screen.log 2>/dev/null | head -n1)
    local error_log
    error_log=$(ls *"${pid}"*errors.log 2>/dev/null | head -n1)

    local failed_calls=0
    local successful_calls=0

    if [ -n "$screen_log" ] && [ -f "$screen_log" ]; then
        local fail_line
        fail_line=$(grep -i "failed call" "$screen_log" 2>/dev/null | tail -n1)
        if [ -n "$fail_line" ]; then
            failed_calls=$(echo "$fail_line" | grep -oP '\d+(?=\s+failed call)' 2>/dev/null || echo 0)
            successful_calls=$(echo "$fail_line" | grep -oP '\d+(?=\s+successful call)' 2>/dev/null || echo 0)
        fi
    fi

    local err_count=0
    if [ -n "$error_log" ] && [ -f "$error_log" ]; then
        err_count=$(wc -l < "$error_log" 2>/dev/null || echo 0)
    fi

    if [ "${failed_calls:-0}" -gt 0 ]; then
        echo -e "${RED}[FAIL] SIPp reported ${failed_calls} failed call(s)! (Successful: ${successful_calls:-0})${NC}"
        [ -n "$error_log" ] && echo -e "${RED}       Check error log: ${error_log}${NC}"
        log_msg "ERROR" "SIPp PID ${pid} (${scenario}) reported ${failed_calls} failed calls."
        return 1
    elif [ "${err_count:-0}" -gt 0 ]; then
        echo -e "${YELLOW}[WARN] SIPp errors log contains ${err_count} line(s): ${error_log}${NC}"
        log_msg "WARN" "SIPp PID ${pid} (${scenario}) error log has ${err_count} lines."
    fi

    if [ "${successful_calls:-0}" -gt 0 ]; then
        echo -e "${GREEN}[OK] Verified: ${successful_calls} successful call(s), 0 failed.${NC}"
        log_msg "INFO" "SIPp PID ${pid} (${scenario}) verified: ${successful_calls} successful calls."
    else
        echo -e "${GREEN}[OK] Process completed cleanly.${NC}"
        log_msg "INFO" "SIPp PID ${pid} (${scenario}) finished."
    fi
    return 0
}

monitor_sipp_completion() {
    local pid="$1"
    local desc="$2"
    local max_wait="$3"
    local scenario="$4"

    echo -e "${CYAN}Monitoring ${desc} (PID ${pid}) until completion (max timeout: ${max_wait}s)...${NC}"
    log_msg "INFO" "Monitoring ${desc} (PID ${pid}), timeout ${max_wait}s"

    local elapsed=0
    while kill -0 "$pid" 2>/dev/null; do
        sleep 1
        elapsed=$((elapsed + 1))
        if [ "$elapsed" -ge "$max_wait" ]; then
            echo -e "${RED}TIMEOUT: ${desc} (PID ${pid}) exceeded ${max_wait}s. Terminating...${NC}"
            log_msg "WARN" "Timeout on ${desc} (PID ${pid}). Killing with SIGKILL."
            kill -9 "$pid" 2>/dev/null
            return 124
        fi
    done

    echo -e "${GREEN}${desc} (PID ${pid}) finished after ${elapsed}s.${NC}"
    log_msg "INFO" "${desc} (PID ${pid}) completed after ${elapsed}s."

    verify_sipp_results "$pid" "$scenario"
    return $?
}

check_file() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}ERROR: Required file not found: $1${NC}"
        log_msg "ERROR" "Required file not found: $1"
        return 1
    fi
    return 0
}

# Return the transport family (tcp / udp) from TRANSPORT (u1/un/t1/tn/l1/ln/...).
transport_family() {
    case "${TRANSPORT}" in
        t*) echo tcp ;;   # TCP
        l*) echo tcp ;;   # TLS rides on TCP
        u*) echo udp ;;   # UDP
        *)  echo unknown ;;
    esac
}

# Pre-flight: is <host>:<port> accepting connections on <proto>?
# Returns 0 = reachable, 1 = refused/timeout, 2 = cannot check (UDP or missing tools).
peer_reachable() {
    local host="$1" port="$2" proto="$3"
    case "$proto" in
        tcp)
            if command -v nc &>/dev/null; then
                nc -z -w 2 "$host" "$port" >/dev/null 2>&1
                return $?
            elif timeout 2 bash -c "</dev/tcp/$host/$port" >/dev/null 2>&1; then
                return 0
            else
                return 1
            fi
            ;;
        udp)   return 2 ;;    # UDP has no handshake; passive listener can't be probed reliably
        *)     return 2 ;;
    esac
}

# Print an [OK] / [FAIL] / [WARN] line about the CALLED UAS.
# On FAIL, prompts to continue; returns non-zero if the operator declines.
preflight_called_uas() {
    local proto; proto=$(transport_family)
    peer_reachable "${CALLED_IP}" "${CALLED_CALL_PORT}" "$proto"
    local rc=$?
    if [ $rc -eq 0 ]; then
        echo -e "${GREEN}[OK] CALLED UAS is listening at ${CALLED_IP}:${CALLED_CALL_PORT}/${proto}.${NC}"
        return 0
    elif [ $rc -eq 1 ]; then
        echo -e "${RED}[FAIL] CALLED UAS is NOT reachable at ${CALLED_IP}:${CALLED_CALL_PORT}/${proto}.${NC}"
        echo -e "${RED}       On the CALLED host, start it BEFORE running Basic Call, e.g.:${NC}"
        echo -e "${RED}         ./sipp -sf ${UAS_XML} -i ${CALLED_IP} -p ${CALLED_CALL_PORT} -t ${TRANSPORT} -m ${CALL_COUNT} -aa${NC}"
        echo -e "${RED}       INVITEs will stall at 100 Trying otherwise.${NC}"
        read -p "Continue anyway? [y/N]: " force
        [[ "$force" =~ ^[yY]$ ]] || return 1
        return 0
    else
        echo -e "${YELLOW}[WARN] Cannot reliably probe UDP - confirm the CALLED UAS is running:${NC}"
        echo -e "${YELLOW}         ./sipp -sf ${UAS_XML} -i ${CALLED_IP} -p ${CALLED_CALL_PORT} -t ${TRANSPORT} -m ${CALL_COUNT} -aa${NC}"
        return 0
    fi
}

load_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}ERROR: Config file not found: ${CONFIG_FILE}${NC}"
        exit 1
    fi

    # Tolerate CRLF (Windows) line endings.
    source <(sed 's/\r$//' "$CONFIG_FILE")

    DEBUG_TRACE="${DEBUG_TRACE:-0}"
    PUBLISH_ENABLED="${PUBLISH_ENABLED:-0}"
    NETWORK="${NETWORK:-LAN}"
    OXE_ACCESS="${OXE_ACCESS:-ssh}"
    OXE_MTCL_USER="${OXE_MTCL_USER:-mtcl}"
    OXE_MTCL_PASSWORD="${OXE_MTCL_PASSWORD:-}"
    OXE_ROOT_PASSWORD="${OXE_ROOT_PASSWORD:-}"
    OXE_SCRIPT_PATH="${OXE_SCRIPT_PATH:-/tmpd/sipp_tools}"
    BATCH_SIZE="${BATCH_SIZE:-100}"
    BATCH_PAUSE="${BATCH_PAUSE:-5}"
    PEER_SCRIPT_DIR="${PEER_SCRIPT_DIR:-}"
    PEER_SCRIPT_DIR_ON_CALLER="${PEER_SCRIPT_DIR_ON_CALLER:-}"
    PEER_SCRIPT_DIR_ON_CALLED="${PEER_SCRIPT_DIR_ON_CALLED:-}"
    select_uac_xml
    select_reg_xml

    local missing=""
    for var in NETWORK OXE_PORT \
               OXE_IP_LAN OXE_IP_WAN \
               CALLER_IP_LAN CALLER_IP_WAN \
               CALLED_IP_LAN CALLED_IP_WAN \
               CALLER_RANGE_START CALLER_RANGE_END \
               CALLED_RANGE_START CALLED_RANGE_END \
               CALLER_REG_PORT CALLER_CALL_PORT \
               CALLED_REG_PORT CALLED_CALL_PORT \
               REG_COUNT REG_RATE CALL_COUNT CALL_RATE TRANSPORT; do
        if [ -z "${!var}" ]; then
            missing="${missing}  - ${var}\n"
        fi
    done
    if [ -n "$missing" ]; then
        echo -e "${RED}ERROR: Missing config variables in ${CONFIG_FILE}:${NC}"
        echo -e "${missing}"
        exit 1
    fi

    local ip_regex='^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'
    for var in OXE_IP_LAN OXE_IP_WAN CALLER_IP_LAN CALLER_IP_WAN CALLED_IP_LAN CALLED_IP_WAN; do
        if ! [[ "${!var}" =~ $ip_regex ]]; then
            echo -e "${RED}ERROR: Invalid IP format for ${var}=${!var}${NC}"
            exit 1
        fi
    done

    for var in CALLER_RANGE_START CALLER_RANGE_END CALLED_RANGE_START CALLED_RANGE_END \
               REG_COUNT REG_RATE CALL_COUNT CALL_RATE OXE_PORT \
               CALLER_REG_PORT CALLER_CALL_PORT CALLED_REG_PORT CALLED_CALL_PORT; do
        if ! [[ "${!var}" =~ ^[0-9]+$ ]]; then
            echo -e "${RED}ERROR: ${var}=${!var} is not a valid number${NC}"
            exit 1
        fi
    done

    if [ "$CALLER_RANGE_START" -gt "$CALLER_RANGE_END" ]; then
        echo -e "${RED}ERROR: CALLER_RANGE_START > CALLER_RANGE_END${NC}"; exit 1
    fi
    if [ "$CALLED_RANGE_START" -gt "$CALLED_RANGE_END" ]; then
        echo -e "${RED}ERROR: CALLED_RANGE_START > CALLED_RANGE_END${NC}"; exit 1
    fi

    if [ "$REG_RATE" -eq 0 ] || [ "$CALL_RATE" -eq 0 ]; then
        echo -e "${RED}ERROR: REG_RATE and CALL_RATE must be > 0${NC}"; exit 1
    fi

    apply_network
}

apply_network() {
    # Resolve OXE_IP / CALLER_IP / CALLED_IP and CSV names from NETWORK.
    case "${NETWORK^^}" in
        LAN)
            NETWORK="LAN"
            OXE_IP="$OXE_IP_LAN"
            CALLER_IP="$CALLER_IP_LAN"
            CALLED_IP="$CALLED_IP_LAN"
            ;;
        WAN)
            NETWORK="WAN"
            OXE_IP="$OXE_IP_WAN"
            CALLER_IP="$CALLER_IP_WAN"
            CALLED_IP="$CALLED_IP_WAN"
            ;;
        *)
            echo -e "${RED}ERROR: NETWORK must be LAN or WAN (got: ${NETWORK})${NC}"
            exit 1
            ;;
    esac

    # Node suffix derived from the ACTIVE OXE_IP last octet (e.g. 172.19.5.121 -> node121).
    NODE_SUFFIX="node${OXE_IP##*.}"

    REG_CALLER_CSV="REGISTER_Caller_${NETWORK}_${NODE_SUFFIX}.csv"
    REG_CALLED_CSV="REGISTER_Called_${NETWORK}_${NODE_SUFFIX}.csv"
    CALL_CALLER_CSV="INVITE_Caller_${NETWORK}_${NODE_SUFFIX}.csv"

    local caller_size=$((CALLER_RANGE_END - CALLER_RANGE_START + 1))
    local called_size=$((CALLED_RANGE_END - CALLED_RANGE_START + 1))
    if [ "$caller_size" -ne "$called_size" ]; then
        echo -e "${YELLOW}NOTE: CALLER range ($caller_size) != CALLED range ($called_size); callee will wrap.${NC}"
    fi
}

detect_role() {
    local my_ips
    my_ips=$(hostname -I 2>/dev/null || ip -4 addr show | grep -oP '(?<=inet\s)\d+\.\d+\.\d+\.\d+')
    # Match against both LAN and WAN IPs so role is stable regardless of NETWORK.
    if   echo "$my_ips" | grep -qw "$CALLER_IP_LAN" || echo "$my_ips" | grep -qw "$CALLER_IP_WAN"; then
        ROLE="CALLER"
    elif echo "$my_ips" | grep -qw "$CALLED_IP_LAN" || echo "$my_ips" | grep -qw "$CALLED_IP_WAN"; then
        ROLE="CALLED"
    else
        echo -e "${YELLOW}Could not auto-detect role from local IPs.${NC}"
        echo -e "Local IPs: ${my_ips}"
        echo ""
        echo "Select role:"
        echo "  1) CALLER"
        echo "  2) CALLED"
        read -p "Choice [1/2]: " choice
        case $choice in
            1) ROLE="CALLER" ;;
            2) ROLE="CALLED" ;;
            *) echo "Invalid choice."; exit 1 ;;
        esac
    fi
}

verify_bind_ip() {
    # Warn if the selected NETWORK's bind IP isn't actually on this host.
    local expected
    if [ "$ROLE" = "CALLER" ]; then expected="$CALLER_IP"; else expected="$CALLED_IP"; fi
    local my_ips
    my_ips=$(hostname -I 2>/dev/null || ip -4 addr show | grep -oP '(?<=inet\s)\d+\.\d+\.\d+\.\d+')
    if ! echo "$my_ips" | grep -qw "$expected"; then
        echo -e "${RED}WARNING: bind IP ${expected} (NETWORK=${NETWORK}) is not on this host.${NC}"
        echo -e "${RED}         Local IPs: ${my_ips}${NC}"
        echo -e "${RED}         Switch NETWORK in the config or via menu option 9 before running.${NC}"
        return 1
    fi
    return 0
}

trace_suffix() {
    if [ "${DEBUG_TRACE}" = "1" ]; then
        echo "${TRACE_FLAGS}"
    fi
}

select_uac_xml() {
    # Pick the CALLER-side scenario based on PUBLISH_ENABLED.
    if [ "${PUBLISH_ENABLED}" = "1" ]; then
        UAC_XML="${UAC_XML_PUBLISH}"
    else
        UAC_XML="${UAC_XML_PLAIN}"
    fi
}

select_reg_xml() {
    # Prefer unified REGISTER.xml; fall back to role-specific XMLs for backward compatibility
    if [ -f "${SCRIPT_DIR}/${REG_XML_UNIFIED}" ]; then
        REG_XML="${REG_XML_UNIFIED}"
    elif [ "$ROLE" = "CALLER" ] && [ -f "${SCRIPT_DIR}/${REG_CALLER_XML}" ]; then
        REG_XML="${REG_CALLER_XML}"
    elif [ "$ROLE" = "CALLED" ] && [ -f "${SCRIPT_DIR}/${REG_CALLED_XML}" ]; then
        REG_XML="${REG_CALLED_XML}"
    else
        REG_XML="${REG_XML_UNIFIED}"
    fi
}

show_config() {
    local trace_state="OFF"
    [ "${DEBUG_TRACE}" = "1" ] && trace_state="ON  (${TRACE_FLAGS})"
    local publish_state="OFF"
    [ "${PUBLISH_ENABLED}" = "1" ] && publish_state="ON  (PUBLISH after BYE, vq-rtcpxr -> OXE)"
    echo -e "${CYAN}======= Current Configuration =======${NC}"
    echo -e "  Role:        ${BOLD}${ROLE}${NC}"
    echo -e "  Network:     ${BOLD}${NETWORK}${NC}   (LAN=172.19.112.x  WAN=192.168.1.x)"
    echo -e "  OXE:         ${OXE_IP}:${OXE_PORT}   (${NODE_SUFFIX})"
    echo -e "  CALLER IP:   ${CALLER_IP}   (range: ${CALLER_RANGE_START}-${CALLER_RANGE_END})"
    echo -e "  CALLED IP:   ${CALLED_IP}   (range: ${CALLED_RANGE_START}-${CALLED_RANGE_END})"
    echo -e "  Register:    ${REG_COUNT} @ ${REG_RATE}/s  (ports ${CALLER_REG_PORT}/${CALLED_REG_PORT})"
    echo -e "  Basic Call:  ${CALL_COUNT} @ ${CALL_RATE}/s (ports ${CALLER_CALL_PORT}/${CALLED_CALL_PORT})"
    echo -e "  Transport:   ${TRANSPORT}   (XMLs use [transport])"
    echo -e "  Debug trace: ${trace_state}"
    echo -e "  PUBLISH:     ${publish_state}"
    echo -e "  REG XML:     ${REG_XML}"
    echo -e "  UAC XML:     ${UAC_XML}"
    echo -e "  CSVs:        ${REG_CALLER_CSV} / ${REG_CALLED_CSV} / ${CALL_CALLER_CSV}"
    echo -e "  Peer Dir:    $(peer_script_dir)"
    echo -e "  --- OXE User Management ---"
    echo -e "  Access:      ${OXE_ACCESS}   (user: ${OXE_MTCL_USER})"
    echo -e "  Script path: ${OXE_SCRIPT_PATH}"
    echo -e "  Batch:       ${BATCH_SIZE} users, ${BATCH_PAUSE}s pause"
    echo -e "${CYAN}=====================================${NC}"
}

generate_csvs() {
    echo -e "${YELLOW}Generating CSV files for ${ROLE} on NETWORK=${NETWORK}...${NC}"

    if [ "$ROLE" = "CALLER" ]; then
        {
            echo "SEQUENTIAL;field0;field1"
            for i in $(seq ${CALLER_RANGE_START} ${CALLER_RANGE_END}); do
                echo "${i};${OXE_IP}"
            done
        } > "${REG_CALLER_CSV}"
        local cnt=$((CALLER_RANGE_END - CALLER_RANGE_START + 1))
        echo -e "${GREEN}  [OK] ${REG_CALLER_CSV}  (${cnt} users -> OXE ${OXE_IP})${NC}"

        # field2 = OXE_IP, field3 = OXE_PORT. Reference convention - OXE keys its
        # CH subscriber dictionary by <number>@<OXE_IP>, so Request-URI / From / To
        # must use the OXE address. OXE then routes the call to the SIP-registrar-
        # bound endpoint (CALLER_IP for caller, CALLED_IP for callee).
        {
            echo "SEQUENTIAL;field0;field1;field2;field3"
            local callee=${CALLED_RANGE_START}
            for i in $(seq ${CALLER_RANGE_START} ${CALLER_RANGE_END}); do
                if [ "$callee" -gt "$CALLED_RANGE_END" ]; then
                    callee=${CALLED_RANGE_START}
                fi
                echo "${i};${callee};${OXE_IP};${OXE_PORT}"
                callee=$((callee + 1))
            done
        } > "${CALL_CALLER_CSV}"
        echo -e "${GREEN}  [OK] ${CALL_CALLER_CSV}  (${cnt} pairs -> OXE ${OXE_IP}:${OXE_PORT})${NC}"

    elif [ "$ROLE" = "CALLED" ]; then
        {
            echo "SEQUENTIAL;field0;field1"
            for i in $(seq ${CALLED_RANGE_START} ${CALLED_RANGE_END}); do
                echo "${i};${OXE_IP}"
            done
        } > "${REG_CALLED_CSV}"
        local cnt=$((CALLED_RANGE_END - CALLED_RANGE_START + 1))
        echo -e "${GREEN}  [OK] ${REG_CALLED_CSV} (${cnt} users -> OXE ${OXE_IP})${NC}"
        echo -e "${CYAN}  (INVITE_Called.xml needs no CSV.)${NC}"
    fi
    echo ""
}

run_register() {
    echo -e "${YELLOW}Starting Registration (${ROLE} / ${NETWORK})...${NC}"
    verify_bind_ip
    select_reg_xml
    local trace; trace=$(trace_suffix)
    local sipp_bin; sipp_bin=$(resolve_sipp)
    check_file "$sipp_bin" || return 1
    check_file "${SCRIPT_DIR}/${REG_XML}" || check_file "${REG_XML}" || return 1

    local cmd=""
    if [ "$ROLE" = "CALLER" ]; then
        [ ! -f "${REG_CALLER_CSV}" ] && { echo -e "${RED}CSV missing. Generating...${NC}"; generate_csvs; }
        cmd="${sipp_bin} -sf ${REG_XML} -inf ${REG_CALLER_CSV} -i ${CALLER_IP} -p ${CALLER_REG_PORT} -t ${TRANSPORT} -m ${REG_COUNT} -r ${REG_RATE} -aa ${trace} ${OXE_IP}:${OXE_PORT}"
    elif [ "$ROLE" = "CALLED" ]; then
        [ ! -f "${REG_CALLED_CSV}" ] && { echo -e "${RED}CSV missing. Generating...${NC}"; generate_csvs; }
        cmd="${sipp_bin} -sf ${REG_XML} -inf ${REG_CALLED_CSV} -i ${CALLED_IP} -p ${CALLED_REG_PORT} -t ${TRANSPORT} -m ${REG_COUNT} -r ${REG_RATE} -aa ${trace} ${OXE_IP}:${OXE_PORT}"
    fi

    echo -e "${CYAN}Command:${NC}"
    echo "  ${cmd}"
    echo ""
    read -p "Start? [y/N]: " confirm
    if [[ "$confirm" =~ ^[yY]$ ]]; then
        log_msg "INFO" "Starting foreground registration: ${cmd}"
        eval "${cmd}"
        local rc=$?
        log_msg "INFO" "Foreground registration exited with code ${rc}"
        if [ $rc -eq 0 ]; then
            echo -e "${GREEN}Registration completed successfully (exit code 0).${NC}"
        else
            echo -e "${RED}Registration exited with error code ${rc}.${NC}"
        fi
        return $rc
    fi
}

run_basic_call() {
    echo -e "${YELLOW}Starting Basic Call (${ROLE} / ${NETWORK})...${NC}"
    verify_bind_ip
    local trace; trace=$(trace_suffix)
    local sipp_bin; sipp_bin=$(resolve_sipp)
    check_file "$sipp_bin" || return 1

    local cmd=""
    if [ "$ROLE" = "CALLER" ]; then
        check_file "${UAC_XML}" || return 1
        [ ! -f "${CALL_CALLER_CSV}" ] && { echo -e "${RED}CSV missing. Generating...${NC}"; generate_csvs; }
        cmd="${sipp_bin} -sf ${UAC_XML} -inf ${CALL_CALLER_CSV} -i ${CALLER_IP} -p ${CALLER_CALL_PORT} -t ${TRANSPORT} -m ${CALL_COUNT} -r ${CALL_RATE} -aa ${trace} ${OXE_IP}:${OXE_PORT}"
        echo -e "${CYAN}Command:${NC}"
        echo "  ${cmd}"
        echo ""
        echo -e "${YELLOW}!! Requirements on the CALLED host:${NC}"
        echo -e "${YELLOW}     1. INVITE_Called scenario running with '-m ${CALL_COUNT}' or higher${NC}"
        echo -e "${YELLOW}     2. Registered subscribers over the SAME transport (${TRANSPORT})${NC}"
        preflight_called_uas || return 1
    elif [ "$ROLE" = "CALLED" ]; then
        check_file "${UAS_XML}" || return 1
        cmd="${sipp_bin} -sf ${UAS_XML} -i ${CALLED_IP} -p ${CALLED_CALL_PORT} -t ${TRANSPORT} -m ${CALL_COUNT} -aa ${trace}"
        echo -e "${CYAN}Command:${NC}"
        echo "  ${cmd}"
        echo ""
        echo -e "${GREEN}(Start CALLED side BEFORE the CALLER side.)${NC}"
    fi

    read -p "Start? [y/N]: " confirm
    if [[ "$confirm" =~ ^[yY]$ ]]; then
        log_msg "INFO" "Starting foreground basic call: ${cmd}"
        eval "${cmd}"
        local rc=$?
        log_msg "INFO" "Foreground basic call exited with code ${rc}"
        if [ $rc -eq 0 ]; then
            echo -e "${GREEN}Basic Call completed successfully (exit code 0).${NC}"
        else
            echo -e "${RED}Basic Call exited with error code ${rc}.${NC}"
        fi
        return $rc
    fi
}

run_register_bg() {
    local trace; trace=$(trace_suffix)
    local sipp_bin; sipp_bin=$(resolve_sipp)
    check_file "$sipp_bin" || return 1
    select_reg_xml
    check_file "${SCRIPT_DIR}/${REG_XML}" || check_file "${REG_XML}" || return 1

    local pid=""
    if [ "$ROLE" = "CALLER" ]; then
        [ ! -f "${REG_CALLER_CSV}" ] && generate_csvs
        local cmd="${sipp_bin} -sf ${REG_XML} -inf ${REG_CALLER_CSV} -i ${CALLER_IP} -p ${CALLER_REG_PORT} -t ${TRANSPORT} -m ${REG_COUNT} -r ${REG_RATE} -aa ${trace} -bg ${OXE_IP}:${OXE_PORT}"
        pid=$(launch_sipp_bg "REGISTER_Caller" "$cmd")
        local rc=$?
        [ $rc -ne 0 ] && return $rc
        echo "$pid"
        return 0
    elif [ "$ROLE" = "CALLED" ]; then
        [ ! -f "${REG_CALLED_CSV}" ] && generate_csvs
        local cmd="${sipp_bin} -sf ${REG_XML} -inf ${REG_CALLED_CSV} -i ${CALLED_IP} -p ${CALLED_REG_PORT} -t ${TRANSPORT} -m ${REG_COUNT} -r ${REG_RATE} -aa ${trace} -bg ${OXE_IP}:${OXE_PORT}"
        pid=$(launch_sipp_bg "REGISTER_Called" "$cmd")
        local rc=$?
        [ $rc -ne 0 ] && return $rc
        echo "$pid"
        return 0
    fi
    return 1
}

run_basic_call_bg() {
    local trace; trace=$(trace_suffix)
    local sipp_bin; sipp_bin=$(resolve_sipp)
    check_file "$sipp_bin" || return 1

    local pid=""
    if [ "$ROLE" = "CALLER" ]; then
        check_file "${UAC_XML}" || return 1
        [ ! -f "${CALL_CALLER_CSV}" ] && generate_csvs
        # Preflight check
        preflight_called_uas || { echo -e "${RED}Basic Call aborted.${NC}" >&2; log_msg "WARN" "Basic Call aborted by preflight check"; return 1; }
        sleep 1
        local cmd="${sipp_bin} -sf ${UAC_XML} -inf ${CALL_CALLER_CSV} -i ${CALLER_IP} -p ${CALLER_CALL_PORT} -t ${TRANSPORT} -m ${CALL_COUNT} -r ${CALL_RATE} -aa ${trace} -bg ${OXE_IP}:${OXE_PORT}"
        pid=$(launch_sipp_bg "INVITE_Caller" "$cmd")
        local rc=$?
        [ $rc -ne 0 ] && return $rc
        echo "$pid"
        return 0
    elif [ "$ROLE" = "CALLED" ]; then
        check_file "${UAS_XML}" || return 1
        local cmd="${sipp_bin} -sf ${UAS_XML} -i ${CALLED_IP} -p ${CALLED_CALL_PORT} -t ${TRANSPORT} -m ${CALL_COUNT} -aa ${trace} -bg"
        pid=$(launch_sipp_bg "INVITE_Called" "$cmd")
        local rc=$?
        [ $rc -ne 0 ] && return $rc
        echo "$pid"
        return 0
    fi
    return 1
}

run_all() {
    echo -e "${BOLD}Full sequence on NETWORK=${NETWORK}: CSVs -> Register -> Basic Call${NC}"
    echo ""
    log_msg "INFO" "Starting run_all on ${ROLE} (${NETWORK})"
    verify_bind_ip
    generate_csvs

    echo -e "${YELLOW}--- Registration Phase ---${NC}"
    local reg_pid
    reg_pid=$(run_register_bg)
    local rc=$?
    if [ $rc -ne 0 ] || [ -z "$reg_pid" ]; then
        echo -e "${RED}[ERROR] Registration failed to launch.${NC}"
        log_msg "ERROR" "run_all registration launch failed (rc=$rc)"
        return 1
    fi
    echo -e "${GREEN}Registration launched with PID ${reg_pid}.${NC}"

    # Calculate max wait timeout based on user count and rate: (COUNT / RATE) + 10s buffer, minimum 15s
    local max_reg_wait=$(( (REG_COUNT / REG_RATE) + 10 ))
    [ "$max_reg_wait" -lt 15 ] && max_reg_wait=15

    monitor_sipp_completion "$reg_pid" "Registration" "$max_reg_wait" "REGISTER"
    rc=$?
    if [ $rc -ne 0 ]; then
        echo -e "${RED}[ERROR] Registration did NOT pass verification (rc=${rc}).${NC}"
        echo -e "${RED}        Aborting Basic Call phase to avoid false failures.${NC}"
        log_msg "ERROR" "Registration verification failed (rc=${rc}). Aborting run_all."
        return $rc
    fi

    echo ""
    echo -e "${GREEN}--- Registration Phase Succeeded ---${NC}"
    echo ""
    echo -e "${YELLOW}--- Basic Call Phase ---${NC}"
    local call_pid
    call_pid=$(run_basic_call_bg)
    rc=$?
    if [ $rc -ne 0 ] || [ -z "$call_pid" ]; then
        echo -e "${RED}[ERROR] Basic Call failed to launch.${NC}"
        log_msg "ERROR" "run_all basic call launch failed (rc=$rc)"
        return 1
    fi

    echo -e "${GREEN}Basic Call running with PID ${call_pid}.${NC}"
    echo -e "${GREEN}All tests launched successfully. Use option [5] to check status.${NC}"
    log_msg "INFO" "run_all completed launch: Basic call PID ${call_pid}"
}

toggle_trace() {
    if [ "${DEBUG_TRACE}" = "1" ]; then
        DEBUG_TRACE=0
        echo -e "${YELLOW}Debug trace: OFF${NC}"
    else
        DEBUG_TRACE=1
        echo -e "${GREEN}Debug trace: ON  (${TRACE_FLAGS})${NC}"
    fi
    echo -e "${CYAN}(session-only - edit sipp_config.conf to persist)${NC}"
}

toggle_publish() {
    if [ "${PUBLISH_ENABLED}" = "1" ]; then
        PUBLISH_ENABLED=0
    else
        PUBLISH_ENABLED=1
    fi
    select_uac_xml
    if [ "${PUBLISH_ENABLED}" = "1" ]; then
        echo -e "${GREEN}PUBLISH: ON  (VoIP metrics after BYE, targeting OXE)${NC}"
    else
        echo -e "${YELLOW}PUBLISH: OFF${NC}"
    fi
    echo -e "  UAC XML: ${UAC_XML}"
    if [ ! -f "${UAC_XML}" ]; then
        echo -e "${RED}  WARNING: ${UAC_XML} not present in this directory.${NC}"
    fi
    echo -e "${CYAN}(session-only - edit sipp_config.conf to persist)${NC}"
}

switch_network() {
    if [ "${NETWORK}" = "LAN" ]; then
        NETWORK="WAN"
    else
        NETWORK="LAN"
    fi
    apply_network
    echo -e "${GREEN}Network switched to ${BOLD}${NETWORK}${NC}"
    echo -e "  OXE:     ${OXE_IP}  (${NODE_SUFFIX})"
    echo -e "  bind IP: $( [ "$ROLE" = "CALLER" ] && echo "$CALLER_IP" || echo "$CALLED_IP" )"
    echo -e "  CSVs:    ${REG_CALLER_CSV} / ${REG_CALLED_CSV} / ${CALL_CALLER_CSV}"
    echo -e "${CYAN}(session-only - edit NETWORK in sipp_config.conf to persist)${NC}"
    verify_bind_ip
}

check_status() {
    echo -e "${CYAN}=== Managed SIPp Processes ===${NC}"
    local managed_pids
    managed_pids=($(get_managed_pids))

    if [ ${#managed_pids[@]} -eq 0 ]; then
        echo -e "${YELLOW}No managed SIPp processes running.${NC}"
    else
        echo -e "${GREEN}Active managed processes (${#managed_pids[@]}):${NC}"
        ps -p $(IFS=,; echo "${managed_pids[*]}") -o pid,stat,etime,args 2>/dev/null
    fi
    echo ""

    # Check for unmanaged SIPp processes on the host
    local all_pids
    all_pids=($(pgrep -x sipp 2>/dev/null))
    local unmanaged=()
    for ap in "${all_pids[@]}"; do
        local is_m=0
        for mp in "${managed_pids[@]}"; do
            [ "$ap" -eq "$mp" ] && { is_m=1; break; }
        done
        [ $is_m -eq 0 ] && unmanaged+=("$ap")
    done

    if [ ${#unmanaged[@]} -gt 0 ]; then
        echo -e "${YELLOW}Note: Found ${#unmanaged[@]} unmanaged SIPp process(es) on host (started outside this session):${NC}"
        ps -p $(IFS=,; echo "${unmanaged[*]}") -o pid,user,stat,etime,args 2>/dev/null
        echo ""
    fi
}

stop_all() {
    local managed_pids
    managed_pids=($(get_managed_pids))

    if [ ${#managed_pids[@]} -eq 0 ]; then
        echo -e "${YELLOW}No managed SIPp processes running.${NC}"
        local other_pids
        other_pids=($(pgrep -x sipp 2>/dev/null))
        if [ ${#other_pids[@]} -gt 0 ]; then
            echo -e "${YELLOW}Found ${#other_pids[@]} unmanaged SIPp process(es) on host:${NC}"
            ps -p $(IFS=,; echo "${other_pids[*]}") -o pid,user,stat,etime,args 2>/dev/null
            echo ""
            read -p "Stop these UNMANAGED SIPp process(es)? [y/N]: " conf_othe
            if [[ "$conf_other" =~ ^[yY]$ ]]; then
                log_msg "WARN" "User stopping unmanaged SIPp processes: ${other_pids[*]}"
                kill "${other_pids[@]}" 2>/dev/null
                sleep 1
                local still_running
                still_running=($(pgrep -x sipp 2>/dev/null))
                [ ${#still_running[@]} -gt 0 ] && kill -9 "${still_running[@]}" 2>/dev/null
                echo -e "${GREEN}Unmanaged processes stopped.${NC}"
            fi
        fi
        return 0
    fi

    echo -e "${RED}Found ${#managed_pids[@]} managed SIPp process(es):${NC}"
    ps -p $(IFS=,; echo "${managed_pids[*]}") -o pid,stat,etime,args 2>/dev/null
    echo ""
    read -p "Stop managed SIPp process(es)? [y/N]: " confirm
    if [[ "$confirm" =~ ^[yY]$ ]]; then
        log_msg "INFO" "Stopping managed SIPp processes: ${managed_pids[*]}"
        kill "${managed_pids[@]}" 2>/dev/null
        sleep 1

        local remaining=()
        for p in "${managed_pids[@]}"; do
            if kill -0 "$p" 2>/dev/null; then
                remaining+=("$p")
            fi
        done

        if [ ${#remaining[@]} -gt 0 ]; then
            log_msg "WARN" "Force killing managed PIDs: ${remaining[*]}"
            kill -9 "${remaining[@]}" 2>/dev/null
        fi

        # Clear PID file
        > "${PID_FILE}"
        echo -e "${GREEN}All managed SIPp processes stopped.${NC}"
        log_msg "INFO" "All managed SIPp processes stopped."
    else
        echo -e "${YELLOW}Cancelled.${NC}"
    fi
}

edit_config() {
    if command -v nano &>/dev/null; then
        nano "$CONFIG_FILE"
    elif command -v vi &>/dev/null; then
        vi "$CONFIG_FILE"
    else
        echo -e "${YELLOW}No editor found. Edit manually: ${CONFIG_FILE}${NC}"
        return
    fi
    echo -e "${GREEN}Config updated. Reloading...${NC}"
    load_config
    detect_role
    show_config
}

# ---- OXE User Management ----

# ---- Peer Sync ----

peer_ip() {
    # Return the OTHER server's IP (based on this server's role).
    if [ "$ROLE" = "CALLER" ]; then
        echo "${CALLED_IP}"
    else
        echo "${CALLER_IP}"
    fi
}

peer_script_dir() {
    local target_dir=""
    if [ "$ROLE" = "CALLER" ]; then
        target_dir="${PEER_SCRIPT_DIR_ON_CALLED:-${PEER_SCRIPT_DIR}}"
    else
        target_dir="${PEER_SCRIPT_DIR_ON_CALLER:-${PEER_SCRIPT_DIR}}"
    fi

    # Fallback to local SCRIPT_DIR if not configured
    if [ -z "$target_dir" ]; then
        target_dir="${SCRIPT_DIR}"
    fi
    echo "$target_dir"
}

validate_peer_target() {
    local pip="$1"
    local pdir="$2"

    if [ -z "$pip" ]; then
        echo -e "${RED}ERROR: Peer IP address is not defined.${NC}"
        return 1
    fi
    if [ -z "$pdir" ]; then
        echo -e "${RED}ERROR: Peer target directory is not defined.${NC}"
        return 1
    fi

    # Test peer directory existence or create it via SSH (3s timeout)
    local ssh_test="ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=3 root@${pip}"
    if ! ${ssh_test} "mkdir -p '${pdir}'" 2>/dev/null; then
        echo -e "${RED}ERROR: Cannot reach root@${pip} via SSH or create directory '${pdir}'.${NC}"
        echo -e "${RED}       Ensure network reachability and SSH key authentication.${NC}"
        log_msg "ERROR" "Failed SSH check to root@${pip}:${pdir}"
        return 1
    fi
    return 0
}

sync_to_peer() {
    local pip; pip=$(peer_ip)
    local pdir; pdir=$(peer_script_dir)
    echo -e "${YELLOW}Syncing to peer: root@${pip}:${pdir}/${NC}"

    validate_peer_target "${pip}" "${pdir}" || return 1

    # Include scripts, configs, python tools, and scenario XMLs (exclude node-specific CSVs)
    local files="sipp_config.conf sipp_manager.sh oxe_remote.py sync_watcher.py create_sip_users.sh delete_sip_users.sh REGISTER.xml REGISTER_Caller.xml REGISTER_Called.xml INVITE_Caller.xml INVITE_Caller_publish.xml INVITE_Called.xml"

    local synced=0
    local failed=0

    # Acquire lock on peer to prevent collision with auto-sync or other transfers
    ssh -o StrictHostKeyChecking=no -o BatchMode=yes "root@${pip}" "touch '${pdir}/.sync.lock'" 2>/dev/null

    for f in $files; do
        if [ -f "${SCRIPT_DIR}/${f}" ]; then
            # -a: archive mode, -z: compress, -u: skip if newer on receiver, --delay-updates: atomic transfe
            rsync -azu --delay-updates --timeout=10 \
                -e 'ssh -o StrictHostKeyChecking=no -o BatchMode=yes' \
                "${SCRIPT_DIR}/${f}" "root@${pip}:${pdir}/" 2>/dev/null
            if [ $? -eq 0 ]; then
                synced=$((synced + 1))
            else
                echo -e "${RED}  FAILED: ${f}${NC}"
                failed=$((failed + 1))
            fi
        fi
    done

    # Release lock on pee
    ssh -o StrictHostKeyChecking=no -o BatchMode=yes "root@${pip}" "rm -f '${pdir}/.sync.lock'" 2>/dev/null

    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}  [OK] ${synced} file(s) synced to root@${pip}:${pdir}/${NC}"
        log_msg "INFO" "Manual sync to root@${pip}:${pdir}/ completed (${synced} files)"
    else
        echo -e "${RED}  ${failed} file(s) failed, ${synced} synced.${NC}"
        log_msg "WARN" "Manual sync to root@${pip}:${pdir}/ had ${failed} failures"
    fi
}

sync_watcher_start() {
    local pidfile="${SCRIPT_DIR}/.sync_watcher.pid"
    if [ -f "$pidfile" ]; then
        local pid; pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Auto-sync already running (PID ${pid}).${NC}"
            return
        fi
    fi

    local pip; pip=$(peer_ip)
    local pdir; pdir=$(peer_script_dir)
    validate_peer_target "${pip}" "${pdir}" || return 1

    echo -e "${GREEN}Starting auto-sync watcher...${NC}"
    nohup python3 "${SCRIPT_DIR}/sync_watcher.py" "${pip}" "${SCRIPT_DIR}" "${pdir}" 5 \
        > "${SCRIPT_DIR}/.sync_watcher.log" 2>&1 &
    sleep 1
    if [ -f "$pidfile" ]; then
        echo -e "${GREEN}  [OK] Watcher running (PID $(cat $pidfile)), syncing to ${pip}:${pdir} every 5s.${NC}"
        log_msg "INFO" "Auto-sync watcher started with PID $(cat $pidfile) targeting ${pip}:${pdir}"
    else
        echo -e "${RED}  FAILED to start watcher. Check .sync_watcher.log${NC}"
    fi
}

sync_watcher_stop() {
    local pidfile="${SCRIPT_DIR}/.sync_watcher.pid"
    if [ -f "$pidfile" ]; then
        local pid; pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            sleep 1
            echo -e "${GREEN}  Auto-sync watcher stopped (was PID ${pid}).${NC}"
        else
            echo -e "${YELLOW}  PID ${pid} not running (stale pidfile removed).${NC}"
            rm -f "$pidfile"
        fi
    else
        echo -e "${YELLOW}  Auto-sync watcher not running.${NC}"
    fi
}

sync_watcher_status() {
    local pidfile="${SCRIPT_DIR}/.sync_watcher.pid"
    if [ -f "$pidfile" ]; then
        local pid; pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}  Auto-sync: RUNNING (PID ${pid})${NC}"
            return
        fi
    fi
    echo -e "${YELLOW}  Auto-sync: NOT running${NC}"
}

sync_specific_file() {
    local pip; pip=$(peer_ip)
    local pdir; pdir=$(peer_script_dir)

    echo -e "${YELLOW}Files in this directory:${NC}"
    echo ""
    local i=1
    local flist=()
    for f in "${SCRIPT_DIR}"/*; do
        if [ -f "$f" ]; then
            local fname; fname=$(basename "$f")
            # Skip hidden files
            [[ "$fname" == .* ]] && continue
            flist+=("$fname")
            printf "  %2d) %s\n" "$i" "$fname"
            i=$((i + 1))
        fi
    done
    echo ""
    read -p "  Enter file number (or filename): " choice

    local target=""
    # Check if numeric
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#flist[@]} ]; then
        target="${flist[$((choice - 1))]}"
    elif [ -f "${SCRIPT_DIR}/${choice}" ]; then
        target="$choice"
    else
        echo -e "${RED}  File not found.${NC}"
        return 1
    fi

    echo -e "${YELLOW}  Syncing ${target} -> root@${pip}:${pdir}/${NC}"
    validate_peer_target "${pip}" "${pdir}" || return 1
    rsync -azu --delay-updates --timeout=10 -e 'ssh -o StrictHostKeyChecking=no -o BatchMode=yes' \
        "${SCRIPT_DIR}/${target}" "root@${pip}:${pdir}/" 2>/dev/null
        "${SCRIPT_DIR}/${target}" "root@${pip}:${pdir}/" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  [OK] ${target} synced to ${pip}.${NC}"
    else
        echo -e "${RED}  FAILED to sync ${target}.${NC}"
    fi
}

manage_sync() {
    echo -e "${BOLD}=== Peer Sync ===${NC}"
    sync_watcher_status
    echo ""
    echo "  a) Sync now (all common files)"
    echo "  b) Start auto-sync (background watcher)"
    echo "  c) Stop auto-sync"
    echo "  d) Sync a specific file"
    echo "  q) Back"
    echo ""
    read -p "  Choice: " sc
    case $sc in
        a) sync_to_peer ;;
        b) sync_watcher_start ;;
        c) sync_watcher_stop ;;
        d) sync_specific_file ;;
        q) ;;
        *) echo -e "${RED}Invalid.${NC}" ;;
    esac
}

# ---- OXE User Management ----

deploy_oxe_scripts() {
    echo -e "${YELLOW}Deploying user scripts to OXE (${OXE_IP})...${NC}"

    if [ -z "${OXE_MTCL_PASSWORD}" ]; then
        echo -e "${RED}ERROR: OXE_MTCL_PASSWORD not set in config.${NC}"
        return 1
    fi
    if [ -z "${OXE_ROOT_PASSWORD}" ]; then
        echo -e "${RED}ERROR: OXE_ROOT_PASSWORD not set in config.${NC}"
        return 1
    fi

    local create_script="${SCRIPT_DIR}/create_sip_users.sh"
    local delete_script="${SCRIPT_DIR}/delete_sip_users.sh"
    check_file "${create_script}" || return 1
    check_file "${delete_script}" || return 1
    check_file "${SCRIPT_DIR}/oxe_remote.py" || return 1

    SIPP_OXE="${OXE_IP}" \
    SIPP_ACCESS="${OXE_ACCESS}" \
    SIPP_USER="${OXE_MTCL_USER}" \
    SIPP_PASS="${OXE_MTCL_PASSWORD}" \
    SIPP_ROOT_PASS="${OXE_ROOT_PASSWORD}" \
    SIPP_SCRIPT_PATH="${OXE_SCRIPT_PATH}" \
    SIPP_CREATE="${create_script}" \
    SIPP_DELETE="${delete_script}" \
    python3 "${SCRIPT_DIR}/oxe_remote.py" deploy

    local rc=$?
    if [ $rc -eq 0 ]; then
        echo -e "${GREEN}  [OK] Scripts deployed to ${OXE_IP}:${OXE_SCRIPT_PATH}/${NC}"
    else
        echo -e "${RED}  FAILED (exit code $rc)${NC}"
    fi
    return $rc
}

create_oxe_users() {
    _run_oxe_mgr "create"
}

delete_oxe_users() {
    _run_oxe_mgr "delete"
}

_run_oxe_mgr() {
    local action="$1"
    local local_script="${SCRIPT_DIR}/${action}_sip_users.sh"
    local range_start="${CALLER_RANGE_START}"
    local range_end="${CALLED_RANGE_END}"
    local total=$((range_end - range_start + 1))

    if [ -z "${OXE_MTCL_PASSWORD}" ]; then
        echo -e "${RED}ERROR: OXE_MTCL_PASSWORD not set in config.${NC}"
        return 1
    fi
    if [ -z "${OXE_ROOT_PASSWORD}" ]; then
        echo -e "${RED}ERROR: OXE_ROOT_PASSWORD not set in config.${NC}"
        return 1
    fi

    check_file "${local_script}" || return 1
    check_file "${SCRIPT_DIR}/oxe_remote.py" || return 1

    echo -e "${BOLD}${action^} SIP users on OXE (${OXE_IP})${NC}"
    echo -e "  Range:   ${range_start} - ${range_end} (${total} users)"
    echo -e "  Batch:   ${BATCH_SIZE} users, ${BATCH_PAUSE}s pause"
    echo -e "  Login:   ${OXE_MTCL_USER}@${OXE_IP} (${OXE_ACCESS})"
    echo ""
    read -p "Proceed? [y/N]: " confirm
    [[ "$confirm" =~ ^[yY]$ ]] || return 0

    echo -e "${YELLOW}Running (this may take several minutes)...${NC}"
    echo ""

    SIPP_OXE="${OXE_IP}" \
    SIPP_ACCESS="${OXE_ACCESS}" \
    SIPP_USER="${OXE_MTCL_USER}" \
    SIPP_PASS="${OXE_MTCL_PASSWORD}" \
    SIPP_ROOT_PASS="${OXE_ROOT_PASSWORD}" \
    SIPP_SCRIPT_PATH="${OXE_SCRIPT_PATH}" \
    SIPP_LOCAL_SCRIPT="${local_script}" \
    SIPP_CMD_ARGS="${range_start} ${range_end} ${BATCH_SIZE} ${BATCH_PAUSE}" \
    python3 "${SCRIPT_DIR}/oxe_remote.py" run

    local rc=$?
    echo ""
    if [ $rc -eq 0 ]; then
        echo -e "${GREEN}Done.${NC}"
    else
        echo -e "${RED}Command failed (exit code $rc).${NC}"
    fi
    return $rc
}

show_menu() {
    echo ""
    echo -e "${BOLD}===== SIPp Manager (${ROLE} / ${NETWORK}) =====${NC}"
    echo -e "  1) Generate CSVs"
    echo -e "  2) Run Registration"
    echo -e "  3) Run Basic Call"
    echo -e "  4) Run All (Register + Basic Call)"
    echo -e "  5) Check Status"
    echo -e "  6) Stop All SIPp"
    echo -e "  7) Show Configuration"
    echo -e "  8) Edit Configuration"
    echo -e "  9) Switch Network       [current: ${NETWORK}]"
    echo -e " 10) Toggle Debug Trace   [current: ${DEBUG_TRACE}]"
    echo -e " 11) Toggle PUBLISH       [current: ${PUBLISH_ENABLED}]  (VoIP metrics after BYE)"
    echo -e " --- OXE User Management ---"
    echo -e " 12) Deploy Scripts to OXE"
    echo -e " 13) Create Users on OXE"
    echo -e " 14) Delete Users on OXE"
    echo -e " --- Peer Sync ---"
    echo -e " 15) Sync / Auto-sync to Peer"
    echo -e "  0) Exit"
    echo -e "${BOLD}==========================================${NC}"
    echo ""
}

# ---- Main ----
load_config
detect_role
show_config

while true; do
    show_menu
    read -p "Select option: " opt
    echo ""
    case $opt in
        1)  generate_csvs ;;
        2)  run_register ;;
        3)  run_basic_call ;;
        4)  run_all ;;
        5)  check_status ;;
        6)  stop_all ;;
        7)  show_config ;;
        8)  edit_config ;;
        9)  switch_network ;;
        10) toggle_trace ;;
        11) toggle_publish ;;
        12) deploy_oxe_scripts ;;
        13) create_oxe_users ;;
        14) delete_oxe_users ;;
        15) manage_sync ;;
        0)  echo -e "${GREEN}Bye!${NC}"; exit 0 ;;
        *)  echo -e "${RED}Invalid option.${NC}" ;;
    esac
done

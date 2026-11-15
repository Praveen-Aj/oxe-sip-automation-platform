from pathlib import Path


class SippCommandBuilder:
    """
    Safely builds SIPp command argument vectors (no raw shell concatenation).
    Handles UAC, UAS, and REG roles with proper timeout, transport, statistics,
    and credential options.
    """

    def __init__(self, sipp_binary: str = "sipp"):
        self.sipp_binary = sipp_binary

    def build_uac_command(
        self,
        scenario_xml: Path | str,
        target_ip: str,
        target_port: int,
        local_ip: str | None = None,
        local_port: int | None = 5060,
        csv_file: Path | str | None = None,
        rate: float = 10.0,
        call_count: int = 100,
        transport: str = "u1",  # u1 = UDP, t1 = TCP, l1 = TLS
        media_port: int | None = None,
        trace_screen: bool = True,
        trace_err: bool = True,
        trace_stat: bool = True,
        stat_seconds: int = 1,
        stats_file: Path | str | None = None,
    ) -> list[str]:
        target = f"{target_ip}:{target_port}"
        cmd = [self.sipp_binary, target, "-sf", str(scenario_xml)]

        if csv_file:
            cmd.extend(["-inf", str(csv_file)])

        if local_ip:
            cmd.extend(["-i", local_ip])

        if local_port:
            cmd.extend(["-p", str(local_port)])

        if media_port:
            cmd.extend(["-mp", str(media_port)])

        # Call generation rates
        cmd.extend(["-r", str(rate)])
        cmd.extend(["-m", str(call_count)])

        # Transport mapping (SIPp uses -t u1, -t t1, -t l1)
        trans_opt = "u1"
        if transport.upper() == "TCP":
            trans_opt = "t1"
        elif transport.upper() == "TLS":
            trans_opt = "l1"
        cmd.extend(["-t", trans_opt])

        # Traces & stats
        if trace_screen:
            cmd.append("-trace_screen")
        if trace_err:
            cmd.append("-trace_err")
        if trace_stat:
            cmd.extend(["-trace_stat", "-fd", str(stat_seconds)])
        if stats_file:
            cmd.extend(["-stat_delimiter", ";", "-stf", str(stats_file)])

        return cmd

    def build_uas_command(
        self,
        scenario_xml: Path | str,
        local_ip: str | None = None,
        local_port: int | None = 5080,
        media_port: int | None = None,
        transport: str = "u1",
        trace_screen: bool = True,
        trace_err: bool = True,
    ) -> list[str]:
        cmd = [self.sipp_binary, "-sf", str(scenario_xml)]

        if local_ip:
            cmd.extend(["-i", local_ip])

        if local_port:
            cmd.extend(["-p", str(local_port)])

        if media_port:
            cmd.extend(["-mp", str(media_port)])

        trans_opt = "u1"
        if transport.upper() == "TCP":
            trans_opt = "t1"
        elif transport.upper() == "TLS":
            trans_opt = "l1"
        cmd.extend(["-t", trans_opt])

        if trace_screen:
            cmd.append("-trace_screen")
        if trace_err:
            cmd.append("-trace_err")

        return cmd

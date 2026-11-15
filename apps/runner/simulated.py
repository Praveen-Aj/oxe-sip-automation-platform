import time
import uuid

from shared.contracts.runner import IExecutionRunner
from shared.schemas.telemetry import (
    ExecutionStateEnum,
    ExecutionStatusResponse,
    RunnerCapabilities,
    RunnerStatus,
    RunnerStatusEnum,
    RunnerTypeEnum,
    StartExecutionRequest,
)


class SimulatedRunner(IExecutionRunner):
    """
    Simulated Runner implementing IExecutionRunner.
    Generates realistic SIP signaling metrics, response distributions,
    and protocol log streams without spawning physical SIPp processes or connecting to PBX hardware.
    """

    def __init__(self, runner_id: str = "sim-runner-01"):
        self.runner_id = runner_id
        self.runner_name = "Simulated SIPp Engine (Software Prototype)"
        self.start_time = time.time()
        self.active_execution_id: str | None = None
        self.execution_state: ExecutionStateEnum = ExecutionStateEnum.IDLE
        self.exec_start_time: float = 0.0
        self.call_rate: int = 10
        self.call_limit: int = 100
        self.current_scenario: str = "INVITE_Caller_Auth_PRACK"
        self.total_completed: int = 0
        self.failed_calls: int = 0

    def get_capabilities(self) -> RunnerCapabilities:
        return RunnerCapabilities(
            runner_id=self.runner_id,
            runner_name=self.runner_name,
            runner_type=RunnerTypeEnum.SIMULATED,
            is_simulated=True,
            supported_protocols=["UDP", "TCP"],
            supported_scenarios=[
                "REGISTER",
                "REGISTER_Auth",
                "INVITE_Caller",
                "INVITE_Caller_Auth",
                "INVITE_Caller_PRACK",
                "INVITE_Caller_Auth_PRACK",
                "INVITE_Caller_publish"
            ],
            max_call_rate=200,
            tls_support=True,
            pcap_support=True
        )

    def get_status(self) -> RunnerStatus:
        self._update_progress()
        return RunnerStatus(
            runner_id=self.runner_id,
            status=RunnerStatusEnum.BUSY if self.execution_state == ExecutionStateEnum.RUNNING else RunnerStatusEnum.READY,
            execution_state=self.execution_state,
            current_execution_id=self.active_execution_id,
            active_calls=self.call_rate if self.execution_state == ExecutionStateEnum.RUNNING else 0,
            total_calls=self.total_completed,
            failed_calls=self.failed_calls,
            current_cps=float(self.call_rate) if self.execution_state == ExecutionStateEnum.RUNNING else 0.0,
            uptime_seconds=round(time.time() - self.start_time, 1),
            message="[SIMULATED] Engine active. No physical SIP sockets open."
        )

    def start_execution(self, req: StartExecutionRequest) -> ExecutionStatusResponse:
        self.active_execution_id = f"sim-{uuid.uuid4().hex[:8]}"
        self.execution_state = ExecutionStateEnum.RUNNING
        self.exec_start_time = time.time()
        self.call_rate = req.call_rate
        self.call_limit = req.call_limit
        self.current_scenario = req.scenario_id
        self.total_completed = 0
        self.failed_calls = 0

        return self.get_execution_status(self.active_execution_id)

    def stop_execution(self, execution_id: str) -> ExecutionStatusResponse:
        if self.active_execution_id == execution_id or execution_id == "all":
            self.execution_state = ExecutionStateEnum.STOPPING
            self._update_progress()
            self.execution_state = ExecutionStateEnum.ABORTED
        return self.get_execution_status(execution_id)

    def get_execution_status(self, execution_id: str) -> ExecutionStatusResponse:
        self._update_progress()
        elapsed = round(time.time() - self.exec_start_time, 2) if self.exec_start_time > 0 else 0.0

        # Calculate simulated distribution
        success = max(0, self.total_completed - self.failed_calls)
        dist = {
            "100 Trying": self.total_completed,
            "180/183 Progress": self.total_completed,
            "PRACK 200": self.total_completed,
            "200 OK": success,
            "BYE 200": max(0, success - 2),
            "401/407 Challenge": self.total_completed if "Auth" in self.current_scenario else 0,
            "Errors": self.failed_calls
        }

        logs = [
            f"[SIMULATED] Execution ID: {execution_id}",
            f"[OUT] INVITE sip:55011@172.19.112.51:5060 CSeq: 1 INVITE (branch=z9hG4bK-{execution_id})",
            "[IN ] SIP/2.0 100 Trying",
            "[IN ] SIP/2.0 183 Session Progress (Require: 100rel, RSeq: 101)",
            "[OUT] PRACK sip:55011@172.19.112.51:5060 CSeq: 2 PRACK (RAck: 101 1 INVITE)",
            "[IN ] SIP/2.0 200 OK (to PRACK)",
            "[IN ] SIP/2.0 200 OK (to INVITE)",
            "[OUT] ACK sip:55011@172.19.112.51:5060 CSeq: 1 ACK",
            f"[INFO] Progress: {self.total_completed}/{self.call_limit} calls completed at {self.call_rate} cps"
        ]

        return ExecutionStatusResponse(
            execution_id=execution_id,
            scenario_id=self.current_scenario,
            state=self.execution_state,
            is_simulated=True,
            elapsed_seconds=elapsed,
            total_calls=self.total_completed,
            successful_calls=success,
            failed_calls=self.failed_calls,
            current_cps=float(self.call_rate) if self.execution_state == ExecutionStateEnum.RUNNING else 0.0,
            response_distribution=dist,
            recent_logs=logs
        )

    def _update_progress(self):
        if self.execution_state != ExecutionStateEnum.RUNNING:
            return
        elapsed = time.time() - self.exec_start_time
        target = int(elapsed * self.call_rate)
        if target >= self.call_limit:
            self.total_completed = self.call_limit
            self.execution_state = ExecutionStateEnum.COMPLETED
        else:
            self.total_completed = target

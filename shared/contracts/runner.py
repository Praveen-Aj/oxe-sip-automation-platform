from abc import ABC, abstractmethod

from shared.schemas.telemetry import (
    ExecutionStatusResponse,
    RunnerCapabilities,
    RunnerStatus,
    StartExecutionRequest,
)


class IExecutionRunner(ABC):
    """
    Abstract contract for execution runners.
    Both SimulatedRunner (MVP) and future LiveSippRunner / RemoteAgentRunner
    implement this contract.
    """

    @abstractmethod
    def get_capabilities(self) -> RunnerCapabilities:
        """Return runner capabilities and supported scenarios."""

    @abstractmethod
    def get_status(self) -> RunnerStatus:
        """Return current status of the runner."""

    @abstractmethod
    def start_execution(self, req: StartExecutionRequest) -> ExecutionStatusResponse:
        """Start a scenario execution run."""

    @abstractmethod
    def stop_execution(self, execution_id: str) -> ExecutionStatusResponse:
        """Stop an active execution run."""

    @abstractmethod
    def get_execution_status(self, execution_id: str) -> ExecutionStatusResponse:
        """Get live metrics, statistics and recent logs for an execution run."""

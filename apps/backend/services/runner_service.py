from apps.runner.simulated import SimulatedRunner
from shared.contracts.runner import IExecutionRunner

# Global simulated runner instance for the runner interface
active_runner: IExecutionRunner = SimulatedRunner()

def get_runner() -> IExecutionRunner:
    return active_runner

import runpy
from unittest.mock import patch

@patch("services.rabbitmq_service.start_worker")
def test_main_execution(mock_start_worker):
    runpy.run_module("main", run_name="__main__")
    mock_start_worker.assert_called_once()
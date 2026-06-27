import importlib
from unittest.mock import patch
import main

@patch("main.start_worker")
def test_main_execution(mock_start_worker):
    with patch.object(main, "__name__", "__main__"):
        importlib.reload(main)
        mock_start_worker.assert_called_once()
import runpy
from unittest.mock import patch


@patch("services.keyword_enrichment.start_background_enrichment")
@patch("services.rabbitmq_service.start_worker")
def test_main_execution(mock_start_worker, mock_enrichment):
    runpy.run_module("main", run_name="__main__")
    mock_start_worker.assert_called_once()
    mock_enrichment.assert_called_once()
    mock_enrichment.return_value.set.assert_called_once()  # el hilo se detiene al apagar el worker

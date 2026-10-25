from unittest.mock import MagicMock, patch


@patch('services.embedding_service.SentenceTransformer')
def test_generate_vector(mock_transformer_class):
    mock_model = MagicMock()
    mock_model.encode.return_value.tolist.return_value = [0.9, 0.1]
    mock_transformer_class.return_value = mock_model

    from services.embedding_service import EmbeddingService
    service = EmbeddingService()

    result = service.generate_vector("testing text")

    assert result == [0.9, 0.1]
    mock_model.encode.assert_any_call("warmup", show_progress_bar=False)
    mock_model.encode.assert_called_with("testing text", show_progress_bar=False)
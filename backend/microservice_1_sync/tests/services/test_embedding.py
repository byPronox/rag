from unittest.mock import patch, MagicMock

@patch('services.embedding_service.SentenceTransformer')
def test_generar_vector(mock_transformer_class):
    """El servicio convierte texto en una lista de floats, sin barra de progreso en los logs."""
    mock_model_instance = MagicMock()
    mock_encode_result = MagicMock()
    mock_encode_result.tolist.return_value = [0.1, 0.2, 0.3]
    mock_model_instance.encode.return_value = mock_encode_result
    mock_transformer_class.return_value = mock_model_instance

    from services.embedding_service import EmbeddingService

    service = EmbeddingService()
    result = service.generate_vector("test product description")

    mock_transformer_class.assert_called_once()
    mock_model_instance.encode.assert_called_once_with("test product description", show_progress_bar=False)
    assert result == [0.1, 0.2, 0.3]


def test_torch_limitado_a_pocos_hilos():
    """Regresión: en Railway, torch con demasiados hilos hacía que un embedding tardara ~6 s."""
    import torch
    import services.embedding_service

    assert torch.get_num_threads() <= 2
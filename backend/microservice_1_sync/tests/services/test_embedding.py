from unittest.mock import patch, MagicMock

@patch('services.embedding_service.SentenceTransformer')
def test_generate_vector(mock_transformer_class):

    mock_model_instance = MagicMock()
    mock_encode_result = MagicMock()
    mock_encode_result.tolist.return_value = [0.1, 0.2, 0.3]
    mock_model_instance.encode.return_value = mock_encode_result
    mock_transformer_class.return_value = mock_model_instance
    
    from services.embedding_service import EmbeddingService
    
    # Act
    service = EmbeddingService()
    result = service.generate_vector("test product description")
    
    # Assert
    mock_transformer_class.assert_called_once()
    mock_model_instance.encode.assert_called_once_with("test product description")
    assert result == [0.1, 0.2, 0.3]
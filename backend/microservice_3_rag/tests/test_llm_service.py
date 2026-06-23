from unittest.mock import patch, MagicMock
from services.llm_service import generate_rag_response

def test_generate_rag_response_missing_api_key():
    """Valida el manejo de error si falta la API de Groq."""
    reply, tokens = generate_rag_response("S", "T", "M", [], [], "msg", "")
    assert "ERROR" in reply
    assert tokens == 0

@patch('services.llm_service.Groq')
def test_generate_rag_response_success(mock_groq_class):
    """Valida la generación de texto exitosa y el conteo de tokens."""
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = "Bot response here"
    mock_completion.usage.total_tokens = 42
    mock_client.chat.completions.create.return_value = mock_completion
    mock_groq_class.return_value = mock_client
    
    products = [{"name": "Laptop", "sku": "LPT1", "price": 1000, "stock": 5}]
    history = [("user", "Hola")]
    
    reply, tokens = generate_rag_response("Supreme", "Tenant", "llama", products, history, "msg", "key")
    
    assert reply == "Bot response here"
    assert tokens == 42
    mock_client.chat.completions.create.assert_called_once()

@patch('services.llm_service.Groq')
def test_generate_rag_response_exception(mock_groq_class):
    """Valida que el microservicio no muera si Groq se cae."""
    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = Exception("Groq API Timeout")
    mock_groq_class.return_value = mock_client
    
    reply, tokens = generate_rag_response("S", "T", "M", [], [], "msg", "key")
    
    assert "Error communicating with LLM" in reply
    assert "Groq API Timeout" in reply
    assert tokens == 0

@patch('services.llm_service.Groq')
def test_generate_rag_response_empty_catalog(mock_groq_class):
    """Valida la generación de respuesta cuando no hay productos en el contexto."""
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = "Lo siento, no encontré productos similares."
    mock_completion.usage.total_tokens = 30
    mock_client.chat.completions.create.return_value = mock_completion
    mock_groq_class.return_value = mock_client
    
    empty_products = []
    history = [("user", "busco un unicornio de peluche")]
    
    reply, tokens = generate_rag_response(
        supreme_prompt="Supreme", 
        tenant_prompt="Tenant", 
        llm_model="llama3", 
        context_products=empty_products, 
        chat_history=history, 
        user_message="tienes unicornios?", 
        groq_api_key="valid_key"
    )
    
    assert reply == "Lo siento, no encontré productos similares."
    assert tokens == 30
    mock_client.chat.completions.create.assert_called_once()
    
    call_kwargs = mock_client.chat.completions.create.call_args.kwargs
    system_message = call_kwargs["messages"][0]["content"]
    assert "No products match the search." in system_message
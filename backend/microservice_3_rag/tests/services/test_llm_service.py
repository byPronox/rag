from unittest.mock import MagicMock, patch

import pytest

from services.llm_service import (
    DEFAULT_SUPREME_PROMPT, LLM_SECURITY_REMINDER, RESPONSE_RULES, LLMUnavailableError, build_catalog_context,
    build_messages, compose_reply, extract_references, generate_rag_response,
)

PRODUCTS = [
    {"variant_id": 1, "name": "Hyundai Audifonos", "category": "Tecnologia", "price": 130000.0,
     "currency": "COP", "stock": 10, "url": "https://shop/p/1", "description": "*• Sonido claro.*"},
    {"variant_id": 2, "name": "Redmi Buds", "category": "Tecnologia", "price": 85000.0,
     "currency": "COP", "stock": 0, "url": None, "description": ""},
]


def completion(content, tokens=42):
    result = MagicMock()
    result.choices[0].message.content = content
    result.usage.total_tokens = tokens
    return result


def test_catalog_context_has_tags_stock_link_and_categories():
    context = build_catalog_context(PRODUCTS, ["Tecnologia", "Cocina"])
    assert "AVAILABLE CATALOG:" in context
    assert "[P1] Hyundai Audifonos" in context
    assert "130,000.00 COP" in context
    assert "Link: https://shop/p/1" in context
    assert "Details: Sonido claro" in context
    assert "[P2] Redmi Buds" in context and "OUT OF STOCK" in context
    assert "general suggestions" in context and "Tecnologia, Cocina" in context


def test_catalog_context_without_products():
    assert "No relevant products were found" in build_catalog_context([], [])


def test_build_messages_order_and_fallback_prompt():
    history = [("user", "hola"), ("assistant", "¡Hola!"), ("system", "ignorado"), ("user", "")]
    messages = build_messages(None, "Vende con amabilidad", PRODUCTS, [], history, "busco audífonos")
    assert messages[0]["content"] == DEFAULT_SUPREME_PROMPT
    assert "Vende con amabilidad" in messages[1]["content"]
    assert "AVAILABLE CATALOG" in messages[2]["content"]
    assert [m["role"] for m in messages[3:5]] == ["user", "assistant"]
    assert "busco audífonos" in messages[-2]["content"]
    assert messages[-1]["content"] == LLM_SECURITY_REMINDER


def test_missing_api_key_raises():
    with patch("services.llm_service.settings") as mock_settings:
        mock_settings.GROQ_API_KEY = ""
        with pytest.raises(LLMUnavailableError):
            generate_rag_response("S", "T", "m", [], [], "msg", "")


@patch("services.llm_service.Groq")
def test_success_with_reasoning_model(mock_groq):
    client = mock_groq.return_value
    client.chat.completions.create.return_value = completion("Te recomiendo Redmi Buds [P2].")
    reply, tokens = generate_rag_response("S", "T", "openai/gpt-oss-20b", PRODUCTS, [], "msg", "key")
    assert reply == "Te recomiendo Redmi Buds [P2]."
    assert tokens == 42
    kwargs = client.chat.completions.create.call_args.kwargs
    assert kwargs["model"] == "openai/gpt-oss-20b"
    assert kwargs["extra_body"]["include_reasoning"] is False


@patch("services.llm_service.Groq")
def test_retired_company_model_falls_back_to_default(mock_groq):
    # Regresión: llama3-8b-8192 fue retirado por Groq y el chat quedaba respondiendo errores.
    client = mock_groq.return_value
    client.chat.completions.create.side_effect = [Exception("model_not_found"), completion("Hola")]
    reply, _ = generate_rag_response("S", "T", "llama3-8b-8192", [], [], "hola", "key")
    assert reply == "Hola"
    models = [call.kwargs["model"] for call in client.chat.completions.create.call_args_list]
    assert models == ["llama3-8b-8192", "openai/gpt-oss-20b"]
    assert "extra_body" not in client.chat.completions.create.call_args_list[0].kwargs


@patch("services.llm_service.Groq")
def test_regression_llm_error_is_raised_not_returned_as_reply(mock_groq):
    # Defecto: el texto "Error communicating with LLM: ..." se mostraba al cliente y se guardaba.
    mock_groq.return_value.chat.completions.create.side_effect = Exception("timeout")
    with pytest.raises(LLMUnavailableError):
        generate_rag_response("S", "T", "openai/gpt-oss-20b", [], [], "msg", "key")


@patch("services.llm_service.Groq")
def test_empty_reply_is_unavailable(mock_groq):
    mock_groq.return_value.chat.completions.create.return_value = completion("   ")
    with pytest.raises(LLMUnavailableError):
        generate_rag_response("S", "T", "openai/gpt-oss-20b", [], [], "msg", "key")


def test_extract_references_with_tags():
    reply, cited = extract_references("Tengo Redmi Buds [P2] y Hyundai Audifonos [P1] [P9].", PRODUCTS)
    assert reply == "Tengo Redmi Buds y Hyundai Audifonos."
    assert [p["variant_id"] for p in cited] == [2, 1]


def test_extract_references_by_name_when_no_tags():
    reply, cited = extract_references("Te sirven los hyundai audífonos.", PRODUCTS)
    assert reply == "Te sirven los hyundai audífonos."
    assert [p["variant_id"] for p in cited] == [1]


def test_extract_references_none():
    _, cited = extract_references("No tenemos bicicletas.", PRODUCTS)
    assert cited == []


def test_compose_reply_splits_text_around_product_cards():
    raw = "¡Sí! Te recomiendo estos para tu música:\n[[PRODUCTS: P2, P1, P9, P2]]\n¿Buscas algo inalámbrico?"
    result = compose_reply(raw, PRODUCTS)
    assert result["before"] == "¡Sí! Te recomiendo estos para tu música:"
    assert result["after"] == "¿Buscas algo inalámbrico?"
    assert [p["variant_id"] for p in result["products"]] == [2, 1]          # orden del marcador, sin repetidos
    assert result["plain"] == ("¡Sí! Te recomiendo estos para tu música:\nRedmi Buds, Hyundai Audifonos\n"
                               "¿Buscas algo inalámbrico?")                 # historial con nombres reales


def test_compose_reply_marker_variants_and_tags_inside_text():
    result = compose_reply("Mira el Redmi Buds [P2]: [[products P1]]", PRODUCTS)
    assert result["before"] == "Mira el Redmi Buds:"
    assert [p["variant_id"] for p in result["products"]] == [1]


def test_compose_reply_empty_marker_falls_back_to_cited_products():
    result = compose_reply("Te sirve el Redmi Buds [P2] [[PRODUCTS: ]] o el Redmi Buds [P2].", PRODUCTS)
    assert [p["variant_id"] for p in result["products"]] == [2]
    assert result["after"] == "o el Redmi Buds."


def test_compose_reply_without_marker_keeps_previous_behaviour():
    result = compose_reply("Te recomiendo Redmi Buds [P2].", PRODUCTS)
    assert result == {"before": "Te recomiendo Redmi Buds.", "after": "", "products": [PRODUCTS[1]],
                      "plain": "Te recomiendo Redmi Buds."}


def test_response_rules_explain_marker():
    assert "[[PRODUCTS: P1, P3]]" in RESPONSE_RULES

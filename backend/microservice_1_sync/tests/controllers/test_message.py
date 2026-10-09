import hashlib
import json
import hmac
from unittest.mock import patch, MagicMock
import pika
import requests
from controllers import message_controller as mc
from controllers.message_controller import (
    process_product_message, send_feedback_to_odoo, build_embedding_text, is_safe_webhook_url,
)


def _preparar_db(mock_get_db, fetchone_values):
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    if isinstance(fetchone_values, list):
        mock_cursor.fetchone.side_effect = fetchone_values
    else:
        mock_cursor.fetchone.return_value = fetchone_values
    return mock_conn, mock_cursor


def _cola_publicada(channel):
    return channel.basic_publish.call_args.kwargs["routing_key"]


PRODUCTO = {
    "api_key": "valid_key", "action": "sync", "variant_id": 123,
    "display_name": "[SKU1] Product Name", "company_id": 1, "company_name": "Test Co",
}


# ------------------------- Autenticación -------------------------
@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.send_feedback_to_odoo')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_api_key_invalida_va_a_parking_y_notifica(mock_vector, mock_feedback, mock_get_db, mock_rabbitmq_channel):
    channel, method = mock_rabbitmq_channel
    _, mock_cursor = _preparar_db(mock_get_db, None)

    process_product_message(channel, method, None, json.dumps({"api_key": "x", "action": "sync", "variant_id": 1}))

    mock_cursor.execute.assert_called_once()
    mock_vector.assert_not_called()
    assert _cola_publicada(channel) == mc.Config.PARKING_QUEUE_NAME
    channel.basic_ack.assert_called_once()
    channel.basic_nack.assert_not_called()
    mock_feedback.assert_called_once()


# ------------------------- Eliminación -------------------------
@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_eliminar_producto(mock_vector, mock_get_db, mock_rabbitmq_channel):
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = _preparar_db(mock_get_db, (99,))

    process_product_message(channel, method, None,
                            json.dumps({"api_key": "valid_key", "action": "delete", "variant_id": 123}))

    assert mock_cursor.execute.call_count == 2
    sql, params = mock_cursor.execute.call_args_list[1][0]
    assert "DELETE FROM product_embeddings" in sql
    assert params == (123, 99)
    mock_vector.assert_not_called()
    mock_conn.commit.assert_called_once()
    channel.basic_ack.assert_called_once()


# ------------------------- Sincronización de productos -------------------------
@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_producto_nuevo_se_vectoriza_y_guarda_hash(mock_vector, mock_get_db, mock_rabbitmq_channel):
    channel, method = mock_rabbitmq_channel
    # 1) auth -> tenant 99   2) compañía existe   3) no hay hash previo
    mock_conn, mock_cursor = _preparar_db(mock_get_db, [(99,), (1,), None])
    mock_vector.return_value = [0.5, 0.5]

    process_product_message(channel, method, None, json.dumps(PRODUCTO))

    assert mock_cursor.execute.call_count == 4
    sql, params = mock_cursor.execute.call_args_list[3][0]
    assert "INSERT INTO product_embeddings" in sql
    assert params[0] == 123
    assert params[1] == 99
    assert params[3] == "Product Name"
    assert params[19] == [0.5, 0.5]
    assert len(params[20]) == 64  # sha256 hex
    mock_conn.commit.assert_called_once()
    channel.basic_ack.assert_called_once()


@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_texto_sin_cambios_no_revectoriza(mock_vector, mock_get_db, mock_rabbitmq_channel):
    """Si solo cambió stock/precio (v2) o el texto es idéntico, no se llama al modelo."""
    channel, method = mock_rabbitmq_channel
    texto = build_embedding_text(PRODUCTO, "Product Name")
    hash_actual = hashlib.sha256(texto.encode("utf-8")).hexdigest()
    _, mock_cursor = _preparar_db(mock_get_db, [(99,), (1,), (hash_actual,)])

    process_product_message(channel, method, None, json.dumps(PRODUCTO))

    mock_vector.assert_not_called()
    sql = mock_cursor.execute.call_args_list[-1][0][0]
    assert "UPDATE product_embeddings" in sql
    channel.basic_ack.assert_called_once()


@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.send_feedback_to_odoo')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_compania_ajena_va_a_parking(mock_vector, mock_feedback, mock_get_db, mock_rabbitmq_channel):
    """Un tenant no puede escribir productos en una compañía que no registró (aislamiento)."""
    channel, method = mock_rabbitmq_channel
    mock_conn, _ = _preparar_db(mock_get_db, [(99,), None])

    process_product_message(channel, method, None, json.dumps(PRODUCTO))

    mock_vector.assert_not_called()
    mock_conn.rollback.assert_called_once()
    mock_conn.commit.assert_not_called()
    assert _cola_publicada(channel) == mc.Config.PARKING_QUEUE_NAME
    mock_feedback.assert_called_once()


# ------------------------- Handshake -------------------------
@patch('controllers.message_controller.get_db_connection')
def test_handshake_registra_companias(mock_get_db, mock_rabbitmq_channel):
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = _preparar_db(mock_get_db, (99,))
    payload = json.dumps({"api_key": "valid_key", "action": "sync_companies",
                          "companies": [{"id": 10, "name": "Empresa A"}, {"id": 20, "name": "Empresa B"}]})

    process_product_message(channel, method, None, payload)

    assert mock_cursor.execute.call_count == 3
    sql, params = mock_cursor.execute.call_args_list[2][0]
    assert "INSERT INTO user_companies" in sql
    assert params == (99, "20", "Empresa B")
    mock_conn.commit.assert_called_once()
    channel.basic_ack.assert_called_once()


# ------------------------- Mensajes inválidos -------------------------
@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.send_feedback_to_odoo')
def test_json_invalido_va_a_parking_sin_bucle(mock_feedback, mock_get_db, mock_rabbitmq_channel):
    """Regresión: antes un JSON inválido se reencolaba infinitamente (requeue=True)."""
    channel, method = mock_rabbitmq_channel

    process_product_message(channel, method, None, "esto_no_es_un_json_valido")

    mock_get_db.assert_not_called()
    channel.basic_nack.assert_not_called()
    assert _cola_publicada(channel) == mc.Config.PARKING_QUEUE_NAME
    channel.basic_ack.assert_called_once()
    mock_feedback.assert_called_once()


@patch('controllers.message_controller.get_db_connection')
def test_accion_desconocida_va_a_parking(mock_get_db, mock_rabbitmq_channel):
    channel, method = mock_rabbitmq_channel
    mock_conn, _ = _preparar_db(mock_get_db, (99,))

    process_product_message(channel, method, None,
                            json.dumps({"api_key": "valid_key", "action": "accion_inventada", "variant_id": 1}))

    mock_conn.commit.assert_not_called()
    assert _cola_publicada(channel) == mc.Config.PARKING_QUEUE_NAME
    channel.basic_ack.assert_called_once()
    mock_conn.close.assert_called_once()


# ------------------------- Errores transitorios y reintentos -------------------------
@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.send_feedback_to_odoo')
def test_error_de_bd_se_envia_a_reintento(mock_feedback, mock_get_db, mock_rabbitmq_channel):
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = _preparar_db(mock_get_db, (99,))
    mock_cursor.execute.side_effect = Exception("Fatal DB Error")

    process_product_message(channel, method, None,
                            json.dumps({"api_key": "valid_key", "action": "delete", "variant_id": 123}))

    mock_conn.rollback.assert_called_once()
    assert _cola_publicada(channel) == mc.Config.RETRY_QUEUE_NAME
    headers = channel.basic_publish.call_args.kwargs["properties"].headers
    assert headers["x-retry-count"] == 1
    channel.basic_ack.assert_called_once()
    channel.basic_nack.assert_not_called()
    mock_feedback.assert_not_called()  # no se molesta a Odoo en cada reintento
    mock_conn.close.assert_called_once()


@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.send_feedback_to_odoo')
def test_error_tras_maximo_de_reintentos_va_a_parking(mock_feedback, mock_get_db, mock_rabbitmq_channel):
    channel, method = mock_rabbitmq_channel
    _, mock_cursor = _preparar_db(mock_get_db, (99,))
    mock_cursor.execute.side_effect = Exception("Fatal DB Error")
    props = pika.BasicProperties(headers={"x-retry-count": mc.Config.MAX_RETRIES})

    process_product_message(channel, method, props,
                            json.dumps({"api_key": "valid_key", "action": "delete", "variant_id": 123}))

    assert _cola_publicada(channel) == mc.Config.PARKING_QUEUE_NAME
    mock_feedback.assert_called_once()
    channel.basic_ack.assert_called_once()


# ------------------------- Texto a vectorizar -------------------------
def test_texto_v1_identico_al_formato_original():
    """Regresión: v1 debe producir exactamente el mismo texto que la versión anterior."""
    data = {"company_name": "Gudyz", "category": "Juguetes", "price_included": 11.5, "currency": "USD",
            "tax_percent": 15, "price_excluded": 10, "description": "Juguete resistente",
            "accessories": "Pelota", "alternatives": "Cuerda"}
    esperado = (
        "Company: Gudyz. Product: Mordedor. Category: Juguetes. "
        "Price: 11.5 USD (Final price including 15% tax). "
        "Base price without tax is 10 USD. "
        "Description: Juguete resistente. "
        "Accessories for this product: Pelota. "
        "Alternative products: Cuerda."
    )
    with patch.object(mc.Config, "EMBED_TEXT_VERSION", "v1"):
        assert build_embedding_text(data, "Mordedor") == esperado


def test_texto_v2_sin_precio_compania_ni_html():
    data = {"company_name": "Gudyz", "category": "Juguetes", "price_included": 11.5,
            "description": "<p>Juguete <b>resistente</b></p>"}
    with patch.object(mc.Config, "EMBED_TEXT_VERSION", "v2"):
        texto = build_embedding_text(data, "Mordedor")
    assert "Price" not in texto and "Company" not in texto
    assert "<" not in texto
    assert "Juguete resistente" in texto


# ------------------------- Seguridad del webhook (SSRF) -------------------------
def test_webhook_con_esquema_invalido_rechazado():
    assert is_safe_webhook_url("file:///etc/passwd") is False
    assert is_safe_webhook_url("") is False


@patch('controllers.message_controller.socket.getaddrinfo')
def test_webhook_a_ip_privada_rechazado(mock_dns):
    mock_dns.return_value = [(None, None, None, None, ("10.0.0.5", 80))]
    with patch.object(mc.Config, "ALLOW_PRIVATE_WEBHOOKS", False):
        assert is_safe_webhook_url("http://interno.local/webhook") is False


@patch('controllers.message_controller.socket.getaddrinfo')
def test_webhook_a_ip_publica_permitido(mock_dns):
    mock_dns.return_value = [(None, None, None, None, ("93.184.216.34", 443))]
    with patch.object(mc.Config, "ALLOW_PRIVATE_WEBHOOKS", False):
        assert is_safe_webhook_url("https://tienda.example.com/rag/webhook") is True


def test_webhook_privado_permitido_en_local():
    with patch.object(mc.Config, "ALLOW_PRIVATE_WEBHOOKS", True):
        assert is_safe_webhook_url("http://odoo:8069/rag/webhook") is True


# ------------------------- Feedback a Odoo -------------------------
@patch('controllers.message_controller.is_safe_webhook_url', return_value=True)
@patch('controllers.message_controller.requests.post')
def test_feedback_exitoso(mock_post, _mock_safe):
    mock_post.return_value.status_code = 200
    send_feedback_to_odoo("https://odoo.test/webhook", 123, "Error simulado")
    mock_post.assert_called_once()


@patch('controllers.message_controller.is_safe_webhook_url', return_value=True)
@patch('controllers.message_controller.requests.post')
def test_feedback_con_odoo_caido_no_rompe(mock_post, _mock_safe):
    mock_post.side_effect = requests.exceptions.Timeout("Timeout error")
    send_feedback_to_odoo("https://odoo.test/webhook", 123, "Error simulado")
    mock_post.assert_called_once()


@patch('controllers.message_controller.requests.post')
def test_feedback_sin_url_no_hace_nada(mock_post):
    send_feedback_to_odoo(None, 123, "Error simulado")
    mock_post.assert_not_called()


@patch('controllers.message_controller.is_safe_webhook_url', return_value=False)
@patch('controllers.message_controller.requests.post')
def test_feedback_a_url_insegura_no_se_envia(mock_post, _mock_safe):
    send_feedback_to_odoo("http://169.254.169.254/latest", 123, "x")
    mock_post.assert_not_called()

@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_producto_sin_compania_se_guarda_como_global(mock_vector, mock_get_db, mock_rabbitmq_channel):
    channel, method = mock_rabbitmq_channel
    _, mock_cursor = _preparar_db(mock_get_db, [(99,), None])
    mock_vector.return_value = [0.1]
    payload = {**PRODUCTO, "company_id": "global", "company_name": "All Companies"}

    process_product_message(channel, method, None, json.dumps(payload))

    assert mock_cursor.execute.call_count == 3
    params = mock_cursor.execute.call_args_list[2][0][1]
    assert params[15] == "global"
    channel.basic_ack.assert_called_once()


def test_company_id_legacy_false_se_normaliza_a_global():
    """Compatibilidad: versiones viejas del módulo enviaban False."""
    assert mc.normalize_company_id(False) == "global"
    assert mc.normalize_company_id("False") == "global"
    assert mc.normalize_company_id(None) == "global"
    assert mc.normalize_company_id(3) == "3"


@patch('controllers.message_controller.is_safe_webhook_url', return_value=True)
@patch('controllers.message_controller.requests.post')
def test_feedback_va_firmado_con_hmac(mock_post, _mock_safe):
    send_feedback_to_odoo("https://odoo.test/api/rag/feedback", 7, "fallo", api_key="rag_abc")
    kwargs = mock_post.call_args.kwargs
    esperado = hmac.new(b"rag_abc", kwargs["data"], hashlib.sha256).hexdigest()
    assert kwargs["headers"]["X-RAG-Signature"] == esperado
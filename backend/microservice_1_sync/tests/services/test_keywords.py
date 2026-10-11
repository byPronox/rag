import json
from unittest.mock import MagicMock, patch

import pytest
from groq import RateLimitError

from controllers import message_controller as mc
from services import keyword_enrichment as ke
from services import keyword_service as ks


# ------------------------- Texto y hashes -------------------------
def test_texto_v4_pone_keywords_antes_de_la_descripcion():
    data = {"category": "Oficina", "description": "*• Sensor de movimiento.* Muy útil."}
    with patch.object(mc.Config, "EMBED_TEXT_VERSION", "v4"):
        texto = mc.build_embedding_text(data, "Cubo de basura", ["basurero", "trash can"])
    assert texto == "Cubo de basura. Oficina. basurero, trash can. Sensor de movimiento. Muy útil."


def test_texto_v3_ignora_keywords():
    with patch.object(mc.Config, "EMBED_TEXT_VERSION", "v3"):
        assert "basurero" not in mc.build_embedding_text({}, "Cubo", ["basurero"])


def test_variantes_comparten_hash_de_keywords():
    base = mc.compute_keywords_source_hash("Cama ortopédica (Verde)", "Mascotas", "Cama")
    assert base == mc.compute_keywords_source_hash("Cama ortopédica (Gris)", "Mascotas", "Cama")
    assert base != mc.compute_keywords_source_hash("Cama ortopédica (Gris)", "Mascotas", "Otra descripción")
    assert mc.keywords_base_name("Arnés (black, M)") == "Arnés"


def test_search_text_normalizado():
    assert mc.build_search_text("Audífonos Pro", "Tecnología", ["auriculares", "earbuds"]) == \
        "audifonos pro tecnologia auriculares earbuds"


# ------------------------- Reutilización en el consumidor -------------------------
def test_reutiliza_keywords_propias_sin_consultar():
    cur = MagicMock()
    assert mc._reusable_keywords(cur, 3, ("h", ["basurero"], "kh"), "kh") == ["basurero"]
    cur.execute.assert_not_called()


def test_reutiliza_keywords_de_otra_variante():
    cur = MagicMock()
    cur.fetchone.return_value = (["papelera"],)
    assert mc._reusable_keywords(cur, 3, ("h", ["viejas"], "otro-hash"), "kh") == ["papelera"]
    assert cur.execute.call_args[0][1] == (3, "kh")


def test_sin_keywords_queda_pendiente():
    cur = MagicMock()
    cur.fetchone.return_value = None
    assert mc._reusable_keywords(cur, 3, None, "kh") is None


@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_producto_cambiado_reinicia_intentos_de_keywords(mock_vector, mock_get_db, mock_rabbitmq_channel):
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    mock_cursor.fetchone.side_effect = [(99,), (1,), ("hash-viejo", ["vieja"], "kh-viejo"), (["nueva"],)]
    mock_vector.return_value = [0.2]
    payload = {"api_key": "k", "action": "sync", "variant_id": 5, "display_name": "Cubo",
               "company_id": 1, "company_name": "Co"}

    with patch.object(mc.Config, "EMBED_TEXT_VERSION", "v4"):
        mc.process_product_message(channel, method, None, json.dumps(payload))

    sql, params = mock_cursor.execute.call_args_list[-1][0]
    assert "keywords_attempts = CASE" in sql
    assert params[23] == ["nueva"]
    assert params[25] == "cubo nueva"
    channel.basic_ack.assert_called_once()


# ------------------------- LLM por lotes -------------------------
def test_clean_keywords_filtra_y_limita():
    raw = ["Basurero", "basurero ", "Cubo", "", 3, "a" * 50, "uno dos tres cuatro cinco", "123", "papelera"]
    assert ks.clean_keywords(raw, "cubo", limit=5) == ["basurero", "papelera"]
    assert ks.clean_keywords("no es lista", "x") == []


def _completion(content):
    completion = MagicMock()
    completion.choices[0].message.content = content
    return completion


@patch("services.keyword_service.Groq")
def test_lote_devuelve_keywords_por_indice(mock_groq):
    client = mock_groq.return_value
    client.chat.completions.create.return_value = _completion(json.dumps({"products": [
        {"id": "0", "synonyms_es": ["basurero"], "synonyms_en": ["trash can"], "uses": ["tirar basura"]},
        {"id": "1", "synonyms_es": []},
        {"id": "9", "synonyms_es": ["fuera de rango"]},
        {"id": "x"}, "basura",
    ]}))
    products = [{"name": "Cubo", "category": "Hogar", "description": ""}, {"name": "Otro"}]
    with patch.object(ks.Config, "KEYWORDS_LLM_MODEL", "openai/gpt-oss-120b"):
        result = ks.generate_keywords_batch(products, "key")
    assert result == {0: ["basurero", "trash can", "tirar basura"]}
    kwargs = client.chat.completions.create.call_args.kwargs
    assert kwargs["extra_body"]["include_reasoning"] is False
    assert kwargs["response_format"] == {"type": "json_object"}


@patch("services.keyword_service.Groq")
def test_lote_con_modelo_sin_razonamiento(mock_groq):
    mock_groq.return_value.chat.completions.create.return_value = _completion('{"products": []}')
    with patch.object(ks.Config, "KEYWORDS_LLM_MODEL", "llama-3.1-8b-instant"):
        assert ks.generate_keywords_batch([{"name": "A"}], "key") == {}
    assert "extra_body" not in mock_groq.return_value.chat.completions.create.call_args.kwargs


@patch("services.keyword_service.Groq")
def test_regresion_limite_de_groq_no_cuenta_como_fallo(mock_groq):
    # El experimento mostró 429 frecuentes en el plan gratuito: hay que esperar, no descartar productos.
    error = RateLimitError("limit", response=MagicMock(status_code=429), body=None)
    mock_groq.return_value.chat.completions.create.side_effect = error
    with pytest.raises(ks.KeywordsRateLimited):
        ks.generate_keywords_batch([{"name": "A"}], "key")


@patch("services.keyword_service.Groq")
def test_errores_del_llm(mock_groq):
    create = mock_groq.return_value.chat.completions.create
    create.side_effect = TimeoutError("timeout")
    with pytest.raises(ks.KeywordsUnavailable):
        ks.generate_keywords_batch([{"name": "A"}], "key")
    create.side_effect = None
    create.return_value = _completion("no es json")
    with pytest.raises(ks.KeywordsUnavailable):
        ks.generate_keywords_batch([{"name": "A"}], "key")


# ------------------------- Enriquecimiento en segundo plano -------------------------
def _conn_with_cursor(cursor):
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    return conn


def test_api_key_de_global_settings_o_respaldo():
    cur = MagicMock()
    cur.fetchone.return_value = ("gsk-panel",)
    assert ke.get_groq_api_key(cur) == "gsk-panel"
    cur.fetchone.return_value = (None,)
    with patch.object(ke.Config, "GROQ_API_KEY", "gsk-env"):
        assert ke.get_groq_api_key(cur) == "gsk-env"


def test_pendientes_agrupados_por_contenido():
    cur = MagicMock()
    cur.fetchall.return_value = [
        (1, 3, "Cama (Verde)", "Mascotas", "Cama cómoda", None),
        (2, 3, "Cama (Gris)", "Mascotas", "Cama cómoda", None),
        (3, 3, "Rascador", "Gatos", "Para gatos", None),
        (4, 3, "Lámpara", "Hogar", "Luz", None),
    ]
    groups = ke.fetch_pending_groups(cur, max_groups=2)
    assert [len(g["variants"]) for g in groups] == [2, 1]
    assert groups[0]["prompt"]["name"] == "Cama"


@patch("services.keyword_enrichment.embedding_service.generate_vector", return_value=[0.1])
def test_aplicar_keywords_protege_productos_cambiados(_vector):
    cur = MagicMock()
    group = {"user_id": 3, "source_hash": "kh", "variants": [
        {"variant_id": 1, "name": "Cubo", "category": "Hogar", "description": "", "stored_hash": None}]}
    with patch.object(mc.Config, "EMBED_TEXT_VERSION", "v4"):
        ke.apply_keywords(cur, group, ["basurero"])
    sql, params = cur.execute.call_args[0]
    assert "search_keywords IS NULL" in sql and "keywords_source_hash = %s" in sql
    assert params[0] == ["basurero"] and params[2] == "cubo hogar basurero"


@patch("services.keyword_enrichment.apply_keywords")
@patch("services.keyword_enrichment.generate_keywords_batch")
@patch("services.keyword_enrichment.fetch_pending_groups")
@patch("services.keyword_enrichment.get_groq_api_key", return_value="key")
def test_ciclo_aplica_y_marca_fallidos(_key, mock_fetch, mock_batch, mock_apply):
    groups = [{"user_id": 3, "prompt": {"name": n}, "variants": [{"variant_id": i}]}
              for i, n in enumerate(["A", "B"])]
    mock_fetch.return_value = groups
    mock_batch.return_value = {0: ["a"]}
    cur = MagicMock()
    with patch.object(ke.Config, "KEYWORDS_BATCH_SIZE", 8):
        assert ke.enrich_pending(_conn_with_cursor(cur), max_batches=1) == 1
    mock_apply.assert_called_once_with(cur, groups[0], ["a"])
    assert "keywords_attempts + 1" in cur.execute.call_args[0][0]   # B queda para reintento


@patch("services.keyword_enrichment.generate_keywords_batch", side_effect=ke.KeywordsUnavailable("x"))
@patch("services.keyword_enrichment.fetch_pending_groups")
@patch("services.keyword_enrichment.get_groq_api_key", return_value="key")
def test_ciclo_con_llm_caido_suma_intento(_key, mock_fetch, _batch):
    mock_fetch.return_value = [{"user_id": 3, "prompt": {}, "variants": [{"variant_id": 1}]}]
    cur = MagicMock()
    assert ke.enrich_pending(_conn_with_cursor(cur)) == 0
    assert "keywords_attempts + 1" in cur.execute.call_args[0][0]


@patch("services.keyword_enrichment.get_groq_api_key", return_value=None)
def test_sin_api_key_no_hace_nada(_key):
    assert ke.enrich_pending(_conn_with_cursor(MagicMock())) == 0


@patch("services.keyword_enrichment.enrich_pending")
@patch("services.keyword_enrichment.new_db_connection")
def test_hilo_sobrevive_a_errores(mock_conn, mock_enrich):
    stop = MagicMock()
    stop.is_set.side_effect = [False, False, False, True]
    mock_conn.return_value.closed = False
    mock_enrich.side_effect = [ke.KeywordsRateLimited("429"), RuntimeError("db"), 0]
    ke.run_forever(stop)
    assert mock_enrich.call_count == 3
    assert mock_conn.call_count == 2          # tras el error se abre una conexión nueva
    assert stop.wait.call_count == 3


@patch("services.keyword_enrichment.threading.Thread")
def test_arranque_del_hilo(mock_thread):
    with patch.object(ke.Config, "KEYWORDS_ENABLED", False):
        ke.start_background_enrichment()
    mock_thread.assert_not_called()
    with patch.object(ke.Config, "KEYWORDS_ENABLED", True):
        ke.start_background_enrichment()
    mock_thread.return_value.start.assert_called_once()

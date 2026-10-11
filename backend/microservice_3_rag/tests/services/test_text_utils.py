from services.text_utils import (
    clean_description, content_tokens, levenshtein, normalize_text, stem, tokens_match,
)


def test_normalize_text_removes_accents_and_symbols():
    assert normalize_text("  Audífonos   Inalámbricos!! ") == "audifonos inalambricos"
    assert normalize_text(None) == ""


def test_content_tokens_drops_stopwords_and_plural():
    assert content_tokens("Busco algo para mis gatos") == ["gato"]
    assert content_tokens("stop my dog from barking") == ["stop", "dog", "barking"]


def test_stem_keeps_short_words():
    assert stem("gas") == "gas"
    assert stem("ollas") == "olla"


def test_tokens_match_tolerates_one_letter_only():
    assert tokens_match("reloje", "reloj")
    assert tokens_match("audifono", "audifono")
    assert not tokens_match("cama", "camara")
    assert not tokens_match("gps", "gpsx1")


def test_tokens_match_fuzzy_by_length():
    assert tokens_match("audifno", "audifono", fuzzy=True)      # 1 error en palabra de 7 letras
    assert tokens_match("tecnolgia", "tecnologia", fuzzy=True)  # palabras largas toleran 2
    assert tokens_match("cosina", "cocina", fuzzy=True)
    assert not tokens_match("gato", "pato", fuzzy=True)         # palabras cortas: exacto
    assert not tokens_match("lampara", "mascota", fuzzy=True)


def test_levenshtein_cuts_early():
    assert levenshtein("cocina", "cosina", 1) == 1
    assert levenshtein("a", "abcdef", 2) == 3
    assert levenshtein("abcdef", "uvwxyz", 1) == 2


def test_clean_description_strips_markup_and_specs():
    raw = "<p>*• Cancelación de ruido:* activa.</p>\n• Batería 6h.\n*ESPECIFICACIONES:*\nPeso: 50g"
    assert clean_description(raw) == "Cancelación de ruido: activa. Batería 6h"


def test_clean_description_truncates_by_word():
    result = clean_description("palabra " * 100, max_chars=20)
    assert result.endswith("…")
    assert len(result) <= 21

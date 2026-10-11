"""Normalización de texto compartida por la búsqueda léxica, el ranking y el contexto del chat.
Es genérica (español + inglés) para que funcione con el catálogo de cualquier tenant."""
import re
import unicodedata

STOPWORDS = {
    # español
    "a", "al", "algo", "algun", "alguna", "alguno", "ante", "busco", "buscando", "como", "con", "cual",
    "cuales", "de", "del", "el", "ella", "en", "es", "esta", "este", "esto", "hay", "la", "las", "le", "lo",
    "los", "me", "mi", "mis", "necesito", "o", "para", "por", "que", "quiero", "se", "si", "sin", "su",
    "sus", "tiene", "tienen", "tienes", "un", "una", "uno", "unos", "unas", "y", "ya", "yo", "tu", "tus",
    "muy", "mas", "pero", "sobre", "entre", "cosas", "cosa", "producto", "productos",
    # inglés
    "an", "and", "any", "are", "for", "from", "have", "i", "in", "is", "it", "looking", "my", "need",
    "of", "on", "or", "some", "something", "the", "to", "want", "with", "you", "your", "do", "does",
}

_MARKDOWN_NOISE = re.compile(r"[*•●▪◦_#`]+")
_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def strip_accents(text):
    decomposed = unicodedata.normalize("NFKD", text or "")
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def normalize_text(text):
    """'Audífonos  Inalámbricos!' -> 'audifonos inalambricos'"""
    text = strip_accents(text).lower()
    return _NON_ALNUM.sub(" ", text).strip()


def stem(token):
    """Singular aproximado: solo quita la 's' final. El emparejamiento tolera 1 letra de diferencia
    (relojes/reloj, ollas/olla) sin confundir palabras distintas (cama/camara)."""
    if len(token) > 3 and token.endswith("s"):
        return token[:-1]
    return token


def content_tokens(text):
    """Tokens con significado: normalizados, sin stopwords, en singular aproximado."""
    return [stem(t) for t in normalize_text(text).split() if t not in STOPWORDS and len(t) > 1]


def levenshtein(a, b, limit):
    """Distancia de edición con corte temprano: devuelve limit + 1 si se pasa del límite."""
    if abs(len(a) - len(b)) > limit:
        return limit + 1
    previous = list(range(len(b) + 1))
    for i, char_a in enumerate(a, 1):
        current = [i]
        for j, char_b in enumerate(b, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (char_a != char_b)))
        if min(current) > limit:
            return limit + 1
        previous = current
    return previous[-1]


def typo_tolerance(token):
    """Errores de tipeo permitidos según el largo: palabras cortas deben coincidir exacto."""
    if len(token) >= 8:
        return 2
    return 1 if len(token) >= 5 else 0


def tokens_match(query_token, product_token, fuzzy=False):
    if query_token == product_token:
        return True
    short, long_ = sorted((query_token, product_token), key=len)
    if len(short) >= 4 and long_.startswith(short) and len(long_) - len(short) <= 1:
        return True
    limit = typo_tolerance(query_token) if fuzzy else 0
    return limit > 0 and levenshtein(query_token, product_token, limit) <= limit


def clean_description(raw, max_chars=200):
    """Descripción legible para el LLM: sin HTML, viñetas ni ficha técnica, recortada por palabra."""
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = re.split(r"(?i)\b(especificaciones|specifications)\b", text, maxsplit=1)[0]
    text = _MARKDOWN_NOISE.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip(" .:-")
    if len(text) > max_chars:
        text = text[:max_chars].rsplit(" ", 1)[0] + "…"
    return text

"""Clasificación simple del mensaje del chat para decidir si hace falta buscar en el catálogo."""
from services.text_utils import normalize_text, content_tokens

_SMALL_TALK = {
    "hola", "holi", "buenas", "buenos", "buen", "dias", "tardes", "noches", "saludos", "hey", "hi", "hello",
    "gracias", "muchas", "mil", "thanks", "thank", "ok", "okay", "vale", "listo", "perfecto", "genial",
    "chao", "adios", "bye", "hasta", "luego", "pronto", "que", "tal", "como", "estas", "esta", "good",
    "morning", "afternoon", "evening", "you", "are", "how", "si", "no", "claro", "dale", "bien", "super",
}

# Palabras que indican que el mensaje depende del anterior ("¿y en negro?", "¿cuánto cuesta ese?").
_FOLLOW_UP_HINTS = {
    "ese", "esa", "eso", "esos", "esas", "este", "esta", "estos", "estas", "otro", "otra", "otros", "otras",
    "mismo", "misma", "color", "talla", "tamano", "precio", "cuesta", "cuanto", "y", "tambien", "it",
    "that", "those", "this", "these", "other", "another", "same", "price", "size", "cheaper", "barato",
    "economico", "mas",
}


def is_small_talk(message):
    """Saludos, agradecimientos o despedidas: no se busca en el catálogo."""
    words = normalize_text(message).split()
    return bool(words) and len(words) <= 6 and all(w in _SMALL_TALK for w in words)


def is_follow_up(message, max_content_tokens=3):
    """Mensaje corto o con referencias al anterior: hay que buscar con el contexto de la conversación."""
    words = normalize_text(message).split()
    if not words:
        return False
    return len(content_tokens(message)) <= max_content_tokens or any(w in _FOLLOW_UP_HINTS for w in words)

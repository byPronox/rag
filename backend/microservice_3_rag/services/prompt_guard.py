"""Primera capa contra prompt injection (inglés y español). La segunda capa es el recordatorio de
seguridad que se envía al LLM después del mensaje del usuario (llm_service.LLM_SECURITY_REMINDER)."""
import re

from services.text_utils import strip_accents

_PATTERNS = [
    # inglés
    r"ignore\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts?)",
    r"disregard\s+(all\s+|the\s+)?(previous|prior|above)\s+(instructions|rules)",
    r"forget\s+(all|everything|your\s+(rules|instructions))",
    r"(system|developer)\s+prompt",
    r"you\s+are\s+now\s+(a|an|in)\b",
    r"act\s+as\s+(a|an)\s+(different|new|unrestricted)",
    r"jailbreak|do\s+anything\s+now|\bdan\s+mode",
    r"reveal\s+(your|the)\s+(instructions|prompt|rules|api\s*key)",
    r"supreme_?prompt",
    # español
    r"ignora\s+(todas\s+|las\s+)?(las\s+)?(instrucciones|reglas)(\s+anteriores|\s+previas)?",
    r"olvida\s+(todas?\s+)?(las\s+|tus\s+)?(instrucciones|reglas|lo\s+anterior)",
    r"(prompt|mensaje|instrucciones)\s+(del|de)\s+sistema",
    r"ahora\s+eres\s+(un|una)\b",
    r"actua\s+como\s+(un|una)\s+(ia|asistente|modelo)\s+(sin|diferente)",
    r"(muestra(me)?|revela(me)?|dime)\s+(tus|las)\s+(instrucciones|reglas|prompt)",
    r"modo\s+(desarrollador|dios|sin\s+restricciones)",
]
_COMPILED = [re.compile(p, re.IGNORECASE) for p in _PATTERNS]


def is_prompt_injection(message):
    text = strip_accents(message or "")
    return any(p.search(text) for p in _COMPILED)

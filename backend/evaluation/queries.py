"""Set de evaluación: 90 consultas etiquetadas a mano sobre el catálogo real del tenant 3.

- QUERIES (46): consultas "normales" — por categoría, nombre, sinónimo simple, lenguaje natural, necesidad,
  cruce de idioma y consultas de productos que NO existen en la tienda (relevant = []).
- QUERIES_SYN (44): consultas difíciles — sinónimos regionales, otro idioma, errores de tipeo y términos que
  solo aparecen en la descripción.
- USER_REPORTED (7): lo que devolvió MS3 en producción con el modelo desalineado (reportado el 2026-10-11).

`relevant` = variant_id que un humano considera respuesta correcta, o una función (ej. toda una categoría).
Compañías: 2 = Gudyz Ecuador, 4 = Gudyz United States (catálogo en inglés), 7 = Gudyz Colombia,
8 = Audífonos Col.
"""


def r(a, b):
    return list(range(a, b + 1))


def cat(*names):
    names = {n.lower() for n in names}
    return lambda p: (p["category"] or "").lower() in names


TECH_CO = [996, 997, 1020, 1021, 1082]
KITCHEN_CO = [992, 994, 995, 1014, 1016, 1017, 1018, 1019, 777, 778]

QUERIES = [
    # --- Gudyz Colombia (7) ---
    {"company_id": "7", "type": "categoria", "query": "tecnologia", "relevant": TECH_CO},
    {"company_id": "7", "type": "categoria", "query": "cocina", "relevant": KITCHEN_CO},
    {"company_id": "7", "type": "categoria", "query": "mascotas", "relevant": cat("mascotas", "perros", "gatos")},
    {"company_id": "7", "type": "categoria_ambigua", "query": "hogar", "relevant": [776]},
    {"company_id": "7", "type": "sinonimo", "query": "musica", "relevant": [1021, 1082]},
    {"company_id": "7", "type": "sinonimo", "query": "alimento", "relevant": [1016, 1017, 1018, 777, 778, 991]},
    {"company_id": "7", "type": "sinonimo", "query": "limpieza", "relevant": r(1023, 1028) + [1003, 1013]},
    {"company_id": "7", "type": "nombre", "query": "audifonos", "relevant": [1021, 1082]},
    {"company_id": "7", "type": "natural", "query": "algo para maquillarme", "relevant": [1083, 1084, 1085, 1086, 1087]},
    {"company_id": "7", "type": "natural", "query": "accesorios para el cabello", "relevant": [1088, 1089]},
    {"company_id": "7", "type": "natural", "query": "cargador para iphone", "relevant": [996, 997]},
    {"company_id": "7", "type": "natural", "query": "cama para mi perro", "relevant": [1000, 1001, 1002]},
    {"company_id": "7", "type": "nombre", "query": "rascador para gato", "relevant": [983, 998, 999, 820]},
    {"company_id": "7", "type": "necesidad", "query": "abrir botellas de vino", "relevant": [1019]},
    {"company_id": "7", "type": "necesidad", "query": "guardar comida en la nevera", "relevant": [777, 778, 1016, 1017, 1018]},
    {"company_id": "7", "type": "necesidad", "query": "pasear al perro de noche", "relevant": [1012, 814, 815, 816, 817]},
    {"company_id": "7", "type": "no_existe", "query": "bicicleta", "relevant": []},
    {"company_id": "7", "type": "no_existe", "query": "televisor", "relevant": []},
    {"company_id": "7", "type": "no_existe", "query": "perfume", "relevant": []},
    {"company_id": "7", "type": "no_existe", "query": "zapatos deportivos", "relevant": []},
    # --- Audífonos Col (8) ---
    {"company_id": "8", "type": "nombre", "query": "audifonos inalambricos", "relevant": r(1030, 1037)},
    {"company_id": "8", "type": "nombre", "query": "reloj inteligente", "relevant": r(1038, 1051)},
    {"company_id": "8", "type": "necesidad", "query": "microfono para entrevistas", "relevant": r(1065, 1068)},
    {"company_id": "8", "type": "necesidad", "query": "iluminacion para grabar videos", "relevant": r(1055, 1064) + [1071, 1072]},
    {"company_id": "8", "type": "nombre", "query": "estabilizador para celular", "relevant": [1069, 1070]},
    {"company_id": "8", "type": "nombre", "query": "cargador samsung", "relevant": [1080, 1081]},
    {"company_id": "8", "type": "nombre", "query": "cable lightning", "relevant": [1078]},
    {"company_id": "8", "type": "necesidad", "query": "limpieza dental para brackets", "relevant": r(1073, 1076)},
    {"company_id": "8", "type": "no_existe", "query": "comida para perro", "relevant": []},
    {"company_id": "8", "type": "no_existe", "query": "olla", "relevant": []},
    # --- Gudyz United States (4) ---
    {"company_id": "4", "type": "nombre", "query": "automatic litter box", "relevant": [844, 872, 874]},
    {"company_id": "4", "type": "necesidad", "query": "gps tracker for my dog", "relevant": [848, 850, 900, 902]},
    {"company_id": "4", "type": "necesidad", "query": "stop my dog from barking", "relevant": r(974, 978)},
    {"company_id": "4", "type": "nombre", "query": "water fountain for cats", "relevant": [884, 886, 888, 890]},
    {"company_id": "4", "type": "necesidad", "query": "calming treats for anxious pets", "relevant": [943, 944, 945, 950, 951, 952, 967, 972]},
    {"company_id": "4", "type": "nombre", "query": "bike light", "relevant": [551, 552, 553, 554]},
    {"company_id": "4", "type": "cruce_idioma", "query": "arenero automático", "relevant": [844, 872, 874]},
    {"company_id": "4", "type": "no_existe", "query": "lipstick", "relevant": []},
    {"company_id": "4", "type": "no_existe", "query": "smartphone", "relevant": []},
    # --- Gudyz Ecuador (2) ---
    {"company_id": "2", "type": "nombre", "query": "lámpara de pie", "relevant": [207, 208, 209]},
    {"company_id": "2", "type": "sinonimo", "query": "basurero", "relevant": [178, 227, 409]},
    {"company_id": "2", "type": "nombre", "query": "ollas", "relevant": [210, 211]},
    {"company_id": "2", "type": "nombre", "query": "luz para bicicleta", "relevant": [242, 252, 414, 415]},
    {"company_id": "2", "type": "nombre", "query": "pilas recargables", "relevant": [169, 170]},
    {"company_id": "2", "type": "necesidad", "query": "organizar mi escritorio", "relevant": [398, 410, 388, 390]},
    {"company_id": "2", "type": "no_existe", "query": "maquillaje", "relevant": []},
]

QUERIES_SYN = [
    # --- Gudyz Colombia (7) ---
    {"company_id": "7", "type": "sinonimo", "query": "basurero", "relevant": [779, 780]},
    {"company_id": "7", "type": "sinonimo", "query": "caneca de basura", "relevant": [779, 780]},
    {"company_id": "7", "type": "sinonimo", "query": "papelera", "relevant": [779, 780]},
    {"company_id": "7", "type": "sinonimo", "query": "platero", "relevant": [992]},
    {"company_id": "7", "type": "sinonimo", "query": "sacacorchos", "relevant": [1019]},
    {"company_id": "7", "type": "sinonimo", "query": "auriculares", "relevant": [1021, 1082]},
    {"company_id": "7", "type": "sinonimo", "query": "recipientes para comida", "relevant": [777, 778, 1016, 1017, 1018]},
    {"company_id": "7", "type": "sinonimo", "query": "colchon para perro", "relevant": [1000, 1001, 1002]},
    {"company_id": "7", "type": "idioma", "query": "power bank", "relevant": [996, 997]},
    {"company_id": "7", "type": "idioma", "query": "headphones", "relevant": [1021, 1082]},
    {"company_id": "7", "type": "idioma", "query": "selfie stick", "relevant": [1020]},
    {"company_id": "7", "type": "tipeo", "query": "audifnos", "relevant": [1021, 1082]},
    {"company_id": "7", "type": "tipeo", "query": "tecnolgia", "relevant": TECH_CO},
    {"company_id": "7", "type": "tipeo", "query": "cosina", "relevant": KITCHEN_CO},
    {"company_id": "7", "type": "tipeo", "query": "rascdor gato", "relevant": [983, 998, 999, 820]},
    {"company_id": "7", "type": "no_existe", "query": "lavadora", "relevant": []},
    {"company_id": "7", "type": "no_existe", "query": "silla de oficina", "relevant": []},
    # --- Gudyz United States (4) ---
    {"company_id": "4", "type": "idioma", "query": "arenero", "relevant": [844, 872, 874]},
    {"company_id": "4", "type": "idioma", "query": "basurero", "relevant": [496, 525, 526]},
    {"company_id": "4", "type": "idioma", "query": "collar antiladridos", "relevant": r(974, 978)},
    {"company_id": "4", "type": "idioma", "query": "fuente de agua para gatos", "relevant": [884, 886, 888, 890]},
    {"company_id": "4", "type": "idioma", "query": "jaula para pajaros", "relevant": [918]},
    {"company_id": "4", "type": "idioma", "query": "acuario", "relevant": [922]},
    {"company_id": "4", "type": "sinonimo", "query": "slow feeder", "relevant": [961, 962, 980]},
    {"company_id": "4", "type": "sinonimo", "query": "trash can", "relevant": [496, 525, 526]},
    {"company_id": "4", "type": "descripcion", "query": "minimalist", "relevant": [497, 526]},
    {"company_id": "4", "type": "tipeo", "query": "litter bx", "relevant": [844, 872, 874]},
    {"company_id": "4", "type": "nombre", "query": "lamp", "relevant": [497, 498, 506, 527, 528]},
    {"company_id": "4", "type": "no_existe", "query": "perfume", "relevant": []},
    {"company_id": "4", "type": "no_existe", "query": "laptop", "relevant": []},
    # --- Gudyz Ecuador (2) ---
    {"company_id": "2", "type": "sinonimo", "query": "tacho de basura", "relevant": [178, 227, 409]},
    {"company_id": "2", "type": "sinonimo", "query": "sarten", "relevant": [210, 211]},
    {"company_id": "2", "type": "nombre", "query": "cargador inalambrico", "relevant": [399, 401, 402, 841]},
    {"company_id": "2", "type": "nombre", "query": "luz con sensor de movimiento", "relevant": [403, 404, 405]},
    {"company_id": "2", "type": "no_existe", "query": "audifonos", "relevant": []},
    # --- Audifonos Col (8) ---
    {"company_id": "8", "type": "sinonimo", "query": "airpods", "relevant": r(1030, 1037)},
    {"company_id": "8", "type": "idioma", "query": "smartwatch", "relevant": r(1038, 1051)},
    {"company_id": "8", "type": "idioma", "query": "ring light", "relevant": r(1056, 1062)},
    {"company_id": "8", "type": "idioma", "query": "gimbal", "relevant": [1069, 1070]},
    {"company_id": "8", "type": "idioma", "query": "selfie stick", "relevant": [1052, 1053, 1054]},
    {"company_id": "8", "type": "sinonimo", "query": "hilo dental de agua", "relevant": r(1073, 1076)},
    {"company_id": "8", "type": "nombre", "query": "cargador iphone", "relevant": [1077, 1078, 1079]},
    {"company_id": "8", "type": "no_existe", "query": "power bank", "relevant": []},
    {"company_id": "8", "type": "no_existe", "query": "cama para perro", "relevant": []},
]

USER_REPORTED = [
    {"company_id": "7", "query": "tecnologia", "top5": [1089, 983, 1002, 776, 1000]},
    {"company_id": "7", "query": "cocina", "top5": [982, 1014, 1086, 1083, 1087]},
    {"company_id": "7", "query": "mascotas", "top5": [991, 1003, 823, 822, 821]},
    {"company_id": "7", "query": "hogar", "top5": [982, 1086, 1084, 1083, 1087]},
    {"company_id": "7", "query": "musica", "top5": [1082, 994, 982, 776, 1019]},
    {"company_id": "7", "query": "alimento", "top5": [982, 1089, 1085, 1000, 1002]},
    {"company_id": "7", "query": "limpieza", "top5": [1082, 824, 819, 991, 1003]},
]

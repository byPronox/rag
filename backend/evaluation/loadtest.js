// Prueba de carga del Sistema RAG Multi-tenant (RNF-01)
//
// Uso (desde la carpeta donde está este archivo):
//   Prueba rápida (1 usuario, verifica que todo responde):
//     k6 run -e SMOKE=1 -e BASE_URL=https://TU-GATEWAY -e API_KEY=TU_KEY -e COMPANY_ID=7 loadtest.js
//   Prueba completa (búsqueda con 100 usuarios + chat con carga reducida):
//     k6 run -e BASE_URL=https://TU-GATEWAY -e API_KEY=TU_KEY -e COMPANY_ID=7 loadtest.js
//   Solo búsqueda (sin gastar cuota de Groq):
//     k6 run -e NO_CHAT=1 -e BASE_URL=https://TU-GATEWAY -e API_KEY=TU_KEY -e COMPANY_ID=7 loadtest.js
//
// Criterios del RNF-01:
//   - 95 % de las búsquedas en menos de 500 ms
//   - 90 % de las respuestas del chat en menos de 3 s
// Nota: k6 mide el tiempo que ve el cliente (incluye la red desde tu computadora hasta Railway).
// El tiempo del servidor queda en search_history.latency_ms y chat_history.latency_ms.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || '').replace(/\/$/, '');
const API_KEY = __ENV.API_KEY || '';
const COMPANY_ID = __ENV.COMPANY_ID || '2';
const SMOKE = !!__ENV.SMOKE;
const NO_CHAT = !!__ENV.NO_CHAT;

if (!BASE_URL || !API_KEY) {
    throw new Error('Faltan BASE_URL o API_KEY. Pásalos con -e BASE_URL=... -e API_KEY=...');
}

// Consultas reales del set de evaluación (queries.py), por compañía
const QUERIES_BY_COMPANY = {
    // Gudyz Ecuador
    '2': [
        'lámpara de pie', 'basurero', 'ollas', 'luz para bicicleta', 'pilas recargables',
        'organizar mi escritorio', 'tacho de basura', 'sarten', 'cargador inalambrico',
        'luz con sensor de movimiento', 'maquillaje', 'audifonos',
    ],
    // Gudyz Colombia
    '7': [
        'tecnologia', 'cocina', 'mascotas', 'audifonos', 'cargador para iphone',
        'cama para mi perro', 'rascador para gato', 'abrir botellas de vino', 'basurero',
        'caneca de basura', 'auriculares', 'power bank', 'headphones', 'audifnos', 'cosina',
        'recipientes para comida', 'colchon para perro', 'sacacorchos',
        'algo para maquillarme', 'accesorios para el cabello',
    ],
};

const CHAT_BY_COMPANY = {
    '2': [
        'Hola, busco una lámpara de pie',
        '¿Tienen basureros para la cocina?',
        'Necesito un cargador inalámbrico',
        '¿Qué ollas tienen?',
        'Busco una luz para mi bicicleta',
    ],
    '7': [
        'Hola, busco audífonos inalámbricos',
        '¿Tienen algo para mi perro?',
        'Necesito un cargador para iPhone',
        '¿Qué tienen para la cocina?',
        'Busco un regalo para alguien que tiene gatos',
    ],
};

const SEARCH_QUERIES = QUERIES_BY_COMPANY[COMPANY_ID] || QUERIES_BY_COMPANY['2'];
const CHAT_MESSAGES = CHAT_BY_COMPANY[COMPANY_ID] || CHAT_BY_COMPANY['2'];

const HEADERS = { 'Content-Type': 'application/json', 'x-api-key': API_KEY };

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

const scenarios = SMOKE
    ? {
        search: { executor: 'per-vu-iterations', vus: 1, iterations: 5, exec: 'searchFlow' },
        ...(NO_CHAT ? {} : {
            chat: { executor: 'per-vu-iterations', vus: 1, iterations: 2, exec: 'chatFlow', startTime: '5s' },
        }),
    }
    : {
        // Búsqueda: sube a 100 usuarios en 1 min, se mantiene 2 min y baja en 30 s
        search: {
            executor: 'ramping-vus',
            exec: 'searchFlow',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 100 },
                { duration: '2m', target: 100 },
                { duration: '30s', target: 0 },
            ],
        },
        // Chat: pocos usuarios para no superar el límite por minuto del plan gratuito de Groq
        ...(NO_CHAT ? {} : {
            chat: {
                executor: 'constant-vus',
                exec: 'chatFlow',
                vus: 2,
                duration: '3m',
            },
        }),
    };

export const options = {
    scenarios,
    thresholds: {
        'http_req_duration{name:search}': ['p(95)<500'],
        ...(NO_CHAT ? {} : { 'http_req_duration{name:chat}': ['p(90)<3000'] }),
        'checks{name:search}': ['rate>0.99'],
    },
};

export function searchFlow() {
    const body = JSON.stringify({
        query: pick(SEARCH_QUERIES),
        company_id: COMPANY_ID,
        session_id: `loadtest_search_${__VU}`,
    });
    const res = http.post(`${BASE_URL}/api/v1/search/`, body, { headers: HEADERS, tags: { name: 'search' } });
    check(res, { 'búsqueda responde 200': (r) => r.status === 200 }, { name: 'search' });
    if (res.status !== 200) {
        console.warn(`search -> HTTP ${res.status}: ${String(res.body || res.error).substring(0, 300)}`);
    }
    sleep(1 + Math.random() * 2); // tiempo entre búsquedas de un comprador (1 a 3 s)
}

export function chatFlow() {
    const body = JSON.stringify({
        message: pick(CHAT_MESSAGES),
        company_id: COMPANY_ID,
        session_id: `loadtest_chat_${__VU}_${__ITER}`,
    });
    const res = http.post(`${BASE_URL}/api/v1/chat/`, body, {
        headers: HEADERS, tags: { name: 'chat' }, timeout: '30s',
    });
    check(res, {
        'chat responde 200': (r) => r.status === 200,
        'chat no devuelve error de LLM': (r) => r.status === 200 && !(r.json('error')),
    }, { name: 'chat' });
    if (res.status !== 200) {
        console.warn(`chat -> HTTP ${res.status}: ${String(res.body || res.error).substring(0, 300)}`);
    }
    sleep(5 + Math.random() * 5); // 5 a 10 s entre mensajes
}
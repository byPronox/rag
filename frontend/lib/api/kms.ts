// frontend/lib/api/kms.ts

// Tomamos la URL del backend desde tus variables de entorno (o usamos /api por defecto local)
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface EncryptedEnvelope {
    encryptedPayload: string;
    encryptedDataKey: string;
}

/**
 * Función para desencriptar la trama en el Sistema B (Admin)
 */
export async function decryptPayload(envelope: EncryptedEnvelope): Promise<{ payload: string }> {
    const res = await fetch(`${API_BASE}/kms/decrypt`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // Este header es OBLIGATORIO según la documentación de tu compañero (Sistema C)
            "X-System": "B"
        },
        body: JSON.stringify(envelope),
        // Esto asegura que la cookie de sesión viaje en la petición cross-site
        credentials: "include"
    });

    if (!res.ok) {
        throw new Error("Fallo al desencriptar la trama en el servidor KMS.");
    }

    return res.json();
}

/**
 * Función para encriptar la trama hacia el Sistema A (Usuario)
 */
export async function encryptPayload(payload: string): Promise<EncryptedEnvelope> {
    const res = await fetch(`${API_BASE}/kms/encrypt`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // Header OBLIGATORIO
            "X-System": "B"
        },
        body: JSON.stringify({ payload }),
        // Esto asegura que la cookie de sesión viaje en la petición
        credentials: "include"
    });

    if (!res.ok) {
        throw new Error("Fallo al encriptar la trama en el servidor KMS.");
    }

    return res.json();
}
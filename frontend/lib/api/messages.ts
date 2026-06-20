// frontend/lib/api/messages.ts
import { api } from "./client";

export type MessageType = "incident" | "evaluation" | "alert" | "special-request";
export type ConfidentialityLevel = "normal" | "confidential" | "very-confidential";
export type MessageStatus = "unread" | "read";

export interface SecureMessageSummary {
    messageId: string;
    subject: string;
    type: MessageType;
    confidentialityLevel: ConfidentialityLevel;
    sentBy: string;
    sentByName: string;
    sentAt: string;
    status: MessageStatus;
}

export interface SecureMessageContent extends SecureMessageSummary {
    employee: string;
    eventDate: string;
    description: string;
}

// Obtener la lista de mensajes de la base de datos
export async function listMessages(): Promise<SecureMessageSummary[]> {
    const { data } = await api.post<{ messages: SecureMessageSummary[] }>(
        "/messages",
        { action: "list" }
    );
    return data.messages;
}

// Enviar el ID al KMS para descifrar el contenido protegido
export async function decryptMessage(messageId: string): Promise<SecureMessageContent> {
    const { data } = await api.post<SecureMessageContent>(
        "/messages",
        { action: "decrypt", messageId }
    );
    return data;
}
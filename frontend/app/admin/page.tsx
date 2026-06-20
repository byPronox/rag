"use client"

import { useState, useEffect } from "react"
// Importamos las funciones necesarias de la API
import {
  decryptPayload,
  EncryptedEnvelope,
  listMessages,
  decryptMessage,
  SecureMessageSummary,
  SecureMessageContent,
  ConfidentialityLevel
} from "@/lib/api/kms" // O el path correcto a tu archivo api/messages.ts si los separaste
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Unlock, Mail, User, Calendar, FileText, RefreshCw, ShieldAlert, Lock } from "lucide-react"

export default function AdminDashboardPage() {
  // ==========================================
  // ESTADOS PARA HERRAMIENTA MANUAL (JSON)
  // ==========================================
  const [jsonInput, setJsonInput] = useState("")
  const [manualDecryptedResult, setManualDecryptedResult] = useState<any>(null) // Cambiado a any para mostrar todo el JSON si es necesario
  const [isManualDecrypting, setIsManualDecrypting] = useState(false)
  const [manualKmsError, setManualKmsError] = useState("")

  // ==========================================
  // ESTADOS PARA LA BANDEJA (DYNAMODB)
  // ==========================================
  const [messages, setMessages] = useState<SecureMessageSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inboxContent, setInboxContent] = useState<SecureMessageContent | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isInboxDecrypting, setIsInboxDecrypting] = useState(false)
  const [inboxError, setInboxError] = useState("")

  // ==========================================
  // LÓGICA: HERRAMIENTA MANUAL
  // ==========================================
  const handleManualDecrypt = async () => {
    if (!jsonInput.trim()) return;

    setIsManualDecrypting(true);
    setManualKmsError("");
    setManualDecryptedResult(null);

    try {
      let envelope: EncryptedEnvelope;
      try {
        envelope = JSON.parse(jsonInput);
      } catch (parseError) {
        throw new Error("El texto ingresado no es un JSON válido.");
      }

      if (!envelope.encryptedPayload || !envelope.encryptedDataKey) {
        throw new Error("El formato del JSON es incorrecto. Faltan los campos 'encryptedPayload' o 'encryptedDataKey'.");
      }

      // 3. Enviamos la trama al Sistema C
      const result = await decryptPayload(envelope);

      // Si el payload es un string JSON (como tu compañero lo envía ahora), intentamos parsearlo para mostrarlo bonito
      try {
        const parsedPayload = JSON.parse(result.payload);
        setManualDecryptedResult(JSON.stringify(parsedPayload, null, 2));
      } catch {
        // Si no es JSON, lo mostramos tal cual
        setManualDecryptedResult(result.payload);
      }

    } catch (error: any) {
      setManualKmsError(error.message || "Error al desencriptar la trama manual.");
    } finally {
      setIsManualDecrypting(false);
    }
  };

  // ==========================================
  // LÓGICA: BANDEJA (DYNAMODB)
  // ==========================================
  const fetchInbox = async () => {
    setIsLoadingList(true)
    setInboxError("")
    try {
      // Nota: Asegúrate de que listMessages() esté importado correctamente
      const data = await listMessages()
      setMessages(data)
    } catch (err) {
      setInboxError("Error al sincronizar los reportes desde DynamoDB.")
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    fetchInbox()
  }, [])

  const handleSelectMessage = async (id: string) => {
    setSelectedId(id)
    setInboxContent(null)
    setIsInboxDecrypting(true)
    setInboxError("")

    try {
      const fullMessage = await decryptMessage(id)
      setInboxContent(fullMessage)

      setMessages((prev) =>
        prev.map((m) => (m.messageId === id ? { ...m, status: "read" as const } : m))
      )
    } catch (err) {
      setInboxError("No se pudo descifrar el payload del reporte a través de AWS KMS.")
    } finally {
      setIsInboxDecrypting(false)
    }
  }

  const getBadgeStyles = (level: ConfidentialityLevel | string) => {
    switch (level) {
      case "very-confidential": return "bg-red-100 text-red-800 border-red-200"
      case "confidential": return "bg-amber-100 text-amber-800 border-amber-200"
      default: return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }


  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-in fade-in duration-500 space-y-12">

      {/* ==========================================
          SECCIÓN 1: HERRAMIENTA DIDÁCTICA MANUAL
          ========================================== */}
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground mt-1">
            Herramientas criptográficas para la auditoría y descifrado de información KMS.
          </p>
        </div>

        <Card className="border-emerald-200 shadow-sm max-w-3xl">
          <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
              <Unlock className="h-5 w-5 text-emerald-600" />
              Herramienta de Descifrado Manual (Test A $\rightarrow$ B)
            </CardTitle>
            <CardDescription>
              Pega el objeto JSON cifrado (trama opaca) enviado por el Sistema A para procesar su contenido original.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            <textarea
              className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              placeholder='{"encryptedPayload": "...", "encryptedDataKey": "..."}'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />

            <Button
              onClick={handleManualDecrypt}
              disabled={isManualDecrypting || !jsonInput.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2"
            >
              {isManualDecrypting ? "Procesando descifrado..." : "Descifrar Trama"}
            </Button>

            {manualKmsError && (
              <div className="p-3 mt-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 font-medium">
                {manualKmsError}
              </div>
            )}

            {/* Resultado Descifrado Manual */}
            {manualDecryptedResult && (
              <div className="mt-6 pt-4 border-t border-slate-100 animate-in slide-in-from-bottom-2 duration-300">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Mensaje original descifrado:
                </p>
                <div className="p-4 bg-slate-950 text-emerald-400 rounded-md">
                  <pre className="font-mono break-all text-sm whitespace-pre-wrap">
                    {manualDecryptedResult}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <hr className="border-slate-200" />

      {/* ==========================================
          SECCIÓN 2: BANDEJA DE ENTRADA (SISTEMA C)
          ========================================== */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Bandeja de Reportes Seguros</h2>
            <p className="text-sm text-slate-600">Listado de metadatos almacenados en DynamoDB. El payload se descifra al seleccionar.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchInbox} disabled={isLoadingList} className="gap-2 border-indigo-200 text-indigo-700">
            <RefreshCw className={`h-4 w-4 ${isLoadingList ? "animate-spin" : ""}`} />
            Sincronizar DynamoDB
          </Button>
        </div>

        {inboxError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 font-medium">
            {inboxError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

          {/* PANEL IZQUIERDO: LISTA */}
          <Card className="h-[600px] flex flex-col border-slate-200 shadow-sm bg-white">
            <CardHeader className="py-4 border-b bg-slate-50/50">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-600" />
                Metadatos Recibidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-slate-100">
              {isLoadingList ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No hay mensajes en la base de datos.</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.messageId}
                    onClick={() => handleSelectMessage(msg.messageId)}
                    className={`p-4 cursor-pointer transition-colors text-left ${selectedId === msg.messageId ? "bg-indigo-50/70 border-l-4 border-indigo-600" : "hover:bg-slate-50/80"
                      }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold text-indigo-600 truncate">{msg.sentByName}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(msg.sentAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className={`text-sm mt-1 truncate ${msg.status === "unread" ? "font-bold text-slate-900" : "text-slate-700"}`}>
                      {msg.subject}
                    </h4>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${getBadgeStyles(msg.confidentialityLevel)}`}>
                        {msg.confidentialityLevel}
                      </span>
                      {msg.status === "unread" && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* PANEL DERECHO: CONTENIDO */}
          <Card className="h-[600px] flex flex-col border-slate-200 shadow-sm bg-white">
            {selectedId ? (
              <div className="p-6 flex flex-col h-full justify-between">
                {isInboxDecrypting ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-mono text-slate-600 animate-pulse">Consultando AWS KMS...</p>
                  </div>
                ) : inboxContent ? (
                  <div className="flex-1 space-y-5 overflow-y-auto text-left animate-in fade-in duration-300">
                    <div className="border-b pb-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mb-2 ${getBadgeStyles(inboxContent.confidentialityLevel)}`}>
                        Nivel: {inboxContent.confidentialityLevel}
                      </span>
                      <h2 className="text-xl font-semibold text-slate-900">{inboxContent.subject}</h2>
                      <p className="text-xs text-slate-500 mt-1">Remitente: <strong>{inboxContent.sentByName}</strong> ({inboxContent.sentBy})</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border border-slate-100 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Empleado Afectado</span>
                          <strong className="text-slate-800">{inboxContent.employee}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Fecha del Suceso</span>
                          <strong className="text-slate-800">{new Date(inboxContent.eventDate).toLocaleDateString()}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-slate-400 block font-medium flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Contenido Original Descifrado
                      </span>
                      <div className="p-4 bg-white border border-slate-200 rounded-md text-sm text-slate-700 leading-relaxed shadow-inner font-sans min-h-[120px]">
                        {inboxContent.description}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Error en desencriptación.</div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <ShieldAlert className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-medium">Auditoría de Reportes</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">Selecciona un reporte de la bandeja. El contenido protegido nunca se almacena en caché.</p>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  )
}
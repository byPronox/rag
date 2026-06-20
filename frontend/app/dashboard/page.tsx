"use client"

import { useState, useEffect } from "react"
import {
  listMessages,
  decryptMessage,
  SecureMessageSummary,
  SecureMessageContent,
  MessageType,
  ConfidentialityLevel
} from "@/lib/api/messages"
// Si tu BFF cuenta con un endpoint para enviar mensajes desde B, importamos api para el POST
import { api } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Mail,
  ShieldCheck,
  RefreshCw,
  Lock,
  Unlock,
  Send,
  User,
  Calendar,
  FileText
} from "lucide-react"

export default function UserDashboardPage() {
  // --- ESTADOS DE LA BANDEJA (SISTEMA DE TU AMIGO) ---
  const [messages, setMessages] = useState<SecureMessageSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [content, setContent] = useState<SecureMessageContent | null>(null)

  // --- ESTADOS DEL FORMULARIO DE ENVÍO ---
  const [subject, setSubject] = useState("")
  const [msgType, setMsgType] = useState<MessageType>("incident")
  const [confLevel, setConfLevel] = useState<ConfidentialityLevel>("normal")
  const [employee, setEmployee] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [description, setDescription] = useState("")

  // --- ESTADOS DE CONTROL DE CARGA ---
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [uiError, setUiError] = useState("")
  const [uiSuccess, setUiSuccess] = useState("")

  // Sincronizar la bandeja de entrada
  const fetchInbox = async () => {
    setIsLoadingList(true)
    setUiError("")
    try {
      const data = await listMessages()
      setMessages(data)
    } catch (err) {
      setUiError("Error al sincronizar los reportes desde DynamoDB.")
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    fetchInbox()
  }, [])

  // PATRÓN OUTLOOK: Descifrado automático en el onSelect sin botones intermediarios
  const handleSelectMessage = async (id: string) => {
    setSelectedId(id)
    setContent(null)
    setIsDecrypting(true)
    setUiError("")

    try {
      const fullMessage = await decryptMessage(id) // ← KMS decrypt automático mediante BFF
      setContent(fullMessage)

      // Reflejar estado "read" localmente de inmediato sin re-fetch
      setMessages((prev) =>
        prev.map((m) => (m.messageId === id ? { ...m, status: "read" as const } : m))
      )
    } catch (err) {
      setUiError("No se pudo descifrar el payload seguro a través de AWS KMS.")
    } finally {
      setIsDecrypting(false)
    }
  }

  // ENVÍO AL OTRO SISTEMA: Guarda el reporte de forma cifrada en la base de datos compartida
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !employee || !description) return

    setIsSending(true)
    setUiError("")
    setUiSuccess("")

    try {
      // Consumimos el endpoint correspondiente del BFF para almacenar el payload opaco cifrado con KMS
      await api.post("/messages", {
        action: "create", // O la acción de registro definida en el Sistema C
        subject,
        type: msgType,
        confidentialityLevel: confLevel,
        employee,
        eventDate: eventDate || new Date().toISOString().split('T')[0],
        description
      })

      setUiSuccess("¡Reporte confidencial cifrado con KMS y enviado exitosamente!")
      // Limpiar formulario
      setSubject("")
      setEmployee("")
      setEventDate("")
      setDescription("")

      // Refrescar la lista de inmediato
      fetchInbox()
    } catch (err) {
      setUiError("Error al procesar el envío criptográfico en el Sistema C.")
    } finally {
      setIsSending(false)
    }
  }

  // Helper visual para niveles de confidencialidad
  const getBadgeStyles = (level: ConfidentialityLevel) => {
    switch (level) {
      case "very-confidential": return "bg-red-100 text-red-800 border-red-200"
      case "confidential": return "bg-amber-100 text-amber-800 border-amber-200"
      default: return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-in fade-in duration-500 space-y-8">

      {/* Encabezado del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bandeja Segura e Integración KMS</h1>
          <p className="text-sm text-slate-600">Demostración de cifrado asíncronos inter-sistema compartiendo sesión SSO de Cognito.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInbox} disabled={isLoadingList} className="gap-2 border-indigo-200 text-indigo-700">
          <RefreshCw className={`h-4 w-4 ${isLoadingList ? "animate-spin" : ""}`} />
          Sincronizar Bandeja
        </Button>
      </div>

      {uiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 font-medium">
          {uiError}
        </div>
      )}

      {uiSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-700 font-medium">
          {uiSuccess}
        </div>
      )}

      {/* ÁREA PRINCIPAL: DOS PANELES (BANDEJA ESTILO OUTLOOK) */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

        {/* PANEL IZQUIERDO: LISTADO DE REPORTES CIFRADOS */}
        <Card className="h-[550px] flex flex-col border-slate-200 shadow-sm bg-white">
          <CardHeader className="py-4 border-b bg-slate-50/50">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-600" />
              Reportes en DynamoDB
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
              <div className="p-8 text-center text-sm text-slate-500">No hay mensajes opacos en la bandeja segura.</div>
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

        {/* PANEL DERECHO: LECTURA Y DESENCRIPTACIÓN EN VIVO */}
        <Card className="h-[550px] flex flex-col border-slate-200 shadow-sm bg-white">
          {selectedId ? (
            <div className="p-6 flex flex-col h-full justify-between">
              {isDecrypting ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                  <p className="text-sm font-mono text-slate-600 animate-pulse">Invocando AWS KMS y abriendo sobre criptográfico...</p>
                </div>
              ) : content ? (
                // RENDERIZADO CUANDO EL PAYLOAD HA SIDO DESENCRIPTADO POR EL KMS
                <div className="flex-1 space-y-5 overflow-y-auto text-left animate-in fade-in duration-300">
                  <div className="border-b pb-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mb-2 ${getBadgeStyles(content.confidentialityLevel)}`}>
                      {content.confidentialityLevel}
                    </span>
                    <h2 className="text-xl font-semibold text-slate-900">{content.subject}</h2>
                    <p className="text-xs text-slate-500 mt-1">Remitente: <strong>{content.sentByName}</strong> ({content.sentBy})</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border border-slate-100 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Empleado Afectado</span>
                        <strong className="text-slate-800">{content.employee}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Fecha del Suceso</span>
                        <strong className="text-slate-800">{new Date(content.eventDate).toLocaleDateString()}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 block font-medium flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Contenido Desencriptado (Texto Plano)
                    </span>
                    <div className="p-4 bg-white border border-slate-200 rounded-md text-sm text-slate-700 leading-relaxed shadow-inner font-sans min-h-[120px]">
                      {content.description}
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-600 flex items-center gap-1.5 bg-emerald-50 p-2 border border-emerald-100 rounded">
                    <Unlock className="h-3 w-3" /> Descifrado Exitoso: El payload sensible no se almacena expuesto en la BD.
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Error al procesar la trama criptográfica.</div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Lock className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium">Selecciona un reporte de la bandeja</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">Al hacer clic, el sistema invocará de forma transparente al KMS para abrir el registro de DynamoDB.</p>
            </div>
          )}
        </Card>
      </div>

      {/* SECCIÓN INFERIOR: FORMULARIO DE EMISIÓN DE REPORTES HACIA EL OTRO SISTEMA */}
      <Card className="border-indigo-100 shadow-sm bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Send className="h-4 w-4 text-indigo-600" />
            Emitir Reporte Confidencial (Envío con Cifrado Envelope)
          </CardTitle>
          <CardDescription>Crea un reporte confidencial aquí para que aparezca cifrado en el sistema de tu compañero.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSendMessage} className="space-y-4 text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Asunto del Reporte</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Evaluación de Desempeño Q2"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Tipo de Mensaje</label>
                <select
                  value={msgType}
                  onChange={(e) => setMsgType(e.target.value as MessageType)}
                  className="w-full p-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="incident">Incidente</option>
                  <option value="evaluation">Evaluación</option>
                  <option value="alert">Alerta</option>
                  <option value="special-request">Petición Especial</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nivel de Confidencialidad</label>
                <select
                  value={confLevel}
                  onChange={(e) => setConfLevel(e.target.value as ConfidentialityLevel)}
                  className="w-full p-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="normal">Normal</option>
                  <option value="confidential">Confidencial</option>
                  <option value="very-confidential">Muy Confidencial</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nombre del Empleado implicado</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={employee}
                  onChange={(e) => setEmployee(e.target.value)}
                  className="w-full p-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Fecha del Evento (Opcional)</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full p-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Descripción del Suceso (Dato Sensible Protegido por KMS)</label>
              <textarea
                required
                placeholder="Escribe el cuerpo del mensaje confidencial aquí..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Button
              type="submit"
              disabled={isSending || !subject || !employee || !description}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 gap-2"
            >
              <Lock className="h-4 w-4" />
              {isSending ? "Cifrando y Almacenando en AWS..." : "Cifrar y Enviar Mensaje"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { encryptPayload, decryptPayload, EncryptedEnvelope } from "@/lib/api/kms"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, Unlock, ArrowRight, ShieldCheck } from "lucide-react"

export default function UserDashboardPage() {
  // --- ESTADOS PARA CIFRAR (TU SISTEMA) ---
  const [plainText, setPlainText] = useState("")

  // --- ESTADO CENTRAL DEL SOBRE (Se llena localmente O desde la URL de tu compañero) ---
  const [currentEnvelope, setCurrentEnvelope] = useState<EncryptedEnvelope | null>(null)
  const [sourceMessage, setSourceMessage] = useState("")

  // --- ESTADOS PARA DESCIFRAR ---
  const [decryptedText, setDecryptedText] = useState("")

  // --- ESTADOS DE CONTROL DE UI ---
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  // ESCUCHADOR DE LA URL: Captura automática si tu compañero te redirige desde su sistema
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const envelopeParam = params.get("envelope");

      if (envelopeParam) {
        try {
          // Decodifica el JSON que viaja en la URL desde el Sistema A
          const parsedEnvelope: EncryptedEnvelope = JSON.parse(decodeURIComponent(envelopeParam));

          if (parsedEnvelope.encryptedPayload && parsedEnvelope.encryptedDataKey) {
            setCurrentEnvelope(parsedEnvelope);
            setSourceMessage("recibida desde el Sistema A (Netlify)");
            setError("");
          }
        } catch (e) {
          console.error("Error al procesar el parámetro envelope de la URL", e);
        }
      }
    }
  }, []);

  // EJECUCIÓN: Flujo de Cifrado Local
  const handleEncryptFlow = async () => {
    if (!plainText.trim()) return;

    setIsProcessing(true);
    setError("");
    setDecryptedText("");
    setCurrentEnvelope(null);

    try {
      // Llama a tu backend (Sistema C) para cifrar con AWS KMS
      const envelope = await encryptPayload(plainText);
      setCurrentEnvelope(envelope);
      setSourceMessage("generada localmente en este sistema");
    } catch (err: any) {
      setError("Error al cifrar el mensaje a través del Sistema C.");
    } finally {
      setIsProcessing(false);
    }
  };

  // EJECUCIÓN: Flujo de Descifrado Automático (Solo un botón)
  const handleDecryptFlow = async () => {
    if (!currentEnvelope) return;

    setIsProcessing(true);
    setError("");
    setDecryptedText("");

    try {
      // Toma el sobre criptográfico guardado en memoria y lo descifra con el KMS
      const result = await decryptPayload(currentEnvelope);
      setDecryptedText(result.payload);
    } catch (err: any) {
      setError("Error al descifrar. Asegúrate de mantener la sesión de Cognito activa.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 animate-in fade-in duration-500 space-y-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Consola de Operaciones KMS</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Demostración integrada de cifrado envelope y SSO inter-sistema (ISWZ3206).
        </p>
      </div>

      {/* BLOQUE 1: FORMULARIO PARA ENCRIPTAR */}
      <Card className="border-indigo-200 shadow-sm">
        <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
          <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
            <Lock className="h-4 w-4 text-indigo-600" />
            Paso 1: Cifrar nuevo mensaje (Local)
          </CardTitle>
          <CardDescription>Genera una trama cifrada utilizando las llaves maestras de AWS KMS.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <input
            type="text"
            className="w-full p-2.5 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Escribe algo para encriptar..."
            value={plainText}
            onChange={(e) => setPlainText(e.target.value)}
            disabled={isProcessing}
          />
          <Button
            onClick={handleEncryptFlow}
            disabled={isProcessing || !plainText.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
          >
            {isProcessing && !currentEnvelope ? "Cifrando en AWS..." : "Generar Trama Encriptada"}
          </Button>
        </CardContent>
      </Card>

      {/* Notificación visual si el sistema detecta un JSON listo en memoria */}
      {currentEnvelope && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-md font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Trama lista en memoria, {sourceMessage}.</span>
        </div>
      )}

      {/* BLOQUE 2: BOTÓN ÚNICO PARA DESENCRIPTAR */}
      <Card className={`border-slate-200 shadow-sm transition-all ${!currentEnvelope ? "opacity-50" : "opacity-100"}`}>
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Unlock className="h-4 w-4 text-emerald-600" />
            Paso 2: Descifrar trama cargada
          </CardTitle>
          <CardDescription>
            Envía el sobre almacenado de vuelta a la API para recuperar el texto plano original.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Button
            onClick={handleDecryptFlow}
            disabled={isProcessing || !currentEnvelope}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 shadow-sm"
          >
            {isProcessing && currentEnvelope ? "Descifrando en AWS..." : "Descifrar mensaje automáticamente"}
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Muestra el resultado final plano */}
          {decryptedText && (
            <div className="pt-3 border-t border-slate-100 animate-in slide-in-from-bottom-2 duration-300">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Mensaje original descifrado:
              </span>
              <div className="p-4 bg-slate-950 text-emerald-400 rounded-md font-mono text-sm break-all">
                {decryptedText}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
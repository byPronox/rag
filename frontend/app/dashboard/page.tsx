"use client"

import { useState, useEffect } from "react"
import { decryptPayload, EncryptedEnvelope } from "@/lib/api/kms"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Unlock, ArrowRight, ShieldCheck } from "lucide-react"

export default function UserDashboardPage() {
  // Estado donde se almacena automáticamente el sobre criptográfico recibido por URL
  const [currentEnvelope, setCurrentEnvelope] = useState<EncryptedEnvelope | null>(null)

  // Estados para mostrar el resultado final descifrado
  const [decryptedText, setDecryptedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [decryptError, setDecryptError] = useState("")

  // Capturar automáticamente la trama de la URL al cargar la página
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const envelopeParam = params.get("envelope");

      if (envelopeParam) {
        try {
          // Decodificamos y parseamos el JSON que envió el Sistema A
          const parsedEnvelope: EncryptedEnvelope = JSON.parse(decodeURIComponent(envelopeParam));

          if (parsedEnvelope.encryptedPayload && parsedEnvelope.encryptedDataKey) {
            setCurrentEnvelope(parsedEnvelope);
          }
        } catch (e) {
          console.error("Error al procesar la trama recibida en la URL", e);
        }
      }
    }
  }, []);

  // Función para Descifrar (Se ejecuta al presionar tu botón único)
  const handleDecryptFlow = async () => {
    if (!currentEnvelope) return;

    setIsProcessing(true);
    setDecryptError("");
    setDecryptedText("");

    try {
      // Viaja al Sistema C con la cookie de sesión HttpOnly compartida
      const result = await decryptPayload(currentEnvelope);
      setDecryptedText(result.payload);
    } catch (err: any) {
      setDecryptError("Error al descifrar. Asegúrate de que la sesión de Cognito siga activa.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 animate-in fade-in duration-500 space-y-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recepción Segura KMS</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Evaluación de tramas cifradas inter-sistema bajo un mismo contexto de SSO (Cognito).
        </p>
      </div>

      {/* Alerta informativa si se detecta transferencia automática */}
      {currentEnvelope ? (
        <div className="flex items-center gap-3 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 p-4 rounded-md font-medium">
          <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
          <div>
            <p className="font-semibold">¡Trama Criptográfica Detectada!</p>
            <p className="text-xs text-indigo-600/90 font-normal">El Sistema A transfirió el sobre de forma segura. No requieres pegar datos.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted p-4 rounded-md border border-dashed">
          Esperando redirección del Sistema A con los parámetros criptográficos...
        </div>
      )}

      {/* TARJETA DE DESCIFRADO AUTOMÁTICO */}
      <Card className={`border-slate-200 shadow-sm transition-all ${!currentEnvelope ? "opacity-60" : "opacity-100"}`}>
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Unlock className="h-4 w-4 text-emerald-600" />
            Descifrar Trama del Sistema A
          </CardTitle>
          <CardDescription>
            Abre el sobre criptográfico utilizando las llaves maestras de AWS KMS de forma transparente.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <Button
            onClick={handleDecryptFlow}
            disabled={isProcessing || !currentEnvelope}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 shadow-sm"
          >
            {isProcessing ? "Llamando a AWS KMS..." : "Descifrar mensaje automáticamente"}
          </Button>

          {decryptError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
              {decryptError}
            </div>
          )}

          {decryptedText && (
            <div className="pt-4 border-t border-slate-100 animate-in slide-in-from-bottom-2 duration-300">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Contenido original recuperado:
              </span>
              <div className="p-4 bg-slate-950 text-emerald-400 rounded-md font-mono text-sm break-all shadow-inner">
                {decryptedText}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
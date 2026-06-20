"use client"

import { useState } from "react"
import { decryptPayload, EncryptedEnvelope } from "@/lib/api/kms"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Unlock } from "lucide-react"

export default function AdminKmsDecryptorPage() {
  // Estados para el KMS
  const [jsonInput, setJsonInput] = useState("")
  const [decryptedResult, setDecryptedResult] = useState("")
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [kmsError, setKmsError] = useState("")

  // Función para manejar la desencriptación
  const handleDecrypt = async () => {
    if (!jsonInput.trim()) return;

    setIsDecrypting(true);
    setKmsError("");
    setDecryptedResult("");

    try {
      // 1. Intentamos convertir el texto ingresado a un objeto JSON
      let envelope: EncryptedEnvelope;
      try {
        envelope = JSON.parse(jsonInput);
      } catch (parseError) {
        throw new Error("El texto ingresado no es un JSON válido.");
      }

      // 2. Validamos que tenga las llaves necesarias
      if (!envelope.encryptedPayload || !envelope.encryptedDataKey) {
        throw new Error("El JSON no tiene el formato correcto (faltan campos de encriptación).");
      }

      // 3. Llamamos a la API (Sistema C)
      const result = await decryptPayload(envelope);

      // 4. Mostramos el resultado
      setDecryptedResult(result.payload);
    } catch (error: any) {
      setKmsError(error.message || "Error al desencriptar. Verifica la conexión con el Sistema C.");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-500 space-y-8 px-4">
      {/* Header de la página */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recepción Segura (Admin)</h1>
        <p className="text-muted-foreground mt-1">
          Herramienta administrativa para validar y descifrar tramas KMS.
        </p>
      </div>

      {/* Tarjeta exclusiva del KMS (Desencriptador) */}
      <Card className="border-emerald-200 shadow-sm">
        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
            <Unlock className="h-5 w-5 text-emerald-600" />
            Descifrado KMS (Desde Sistema A)
          </CardTitle>
          <CardDescription>
            Pega aquí el JSON encriptado generado por el Sistema A para ver su contenido real.
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
            onClick={handleDecrypt}
            disabled={isDecrypting || !jsonInput.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2"
          >
            {isDecrypting ? "Descifrando trama..." : "Descifrar Trama"}
          </Button>

          {kmsError && (
            <div className="p-3 mt-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 font-medium">
              {kmsError}
            </div>
          )}

          {/* Resultado Descifrado */}
          {decryptedResult && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Contenido Descifrado:
              </p>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                <p className="text-slate-800 font-mono break-all text-sm">
                  {decryptedResult}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
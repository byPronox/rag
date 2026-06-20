"use client"

import { useState } from "react"
// Importamos la función de desencriptación desde el archivo de servicios que creamos
import { decryptPayload, EncryptedEnvelope } from "@/lib/api/kms"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Unlock } from "lucide-react"

export default function AdminKmsDecryptorPage() {
  // Estados para controlar la entrada del JSON y la respuesta
  const [jsonInput, setJsonInput] = useState("")
  const [decryptedResult, setDecryptedResult] = useState("")
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [kmsError, setKmsError] = useState("")

  // Función que procesa la desencriptación
  const handleDecrypt = async () => {
    if (!jsonInput.trim()) return;

    setIsDecrypting(true);
    setKmsError("");
    setDecryptedResult("");

    try {
      // 1. Validamos que lo ingresado sea un JSON estructurado válido
      let envelope: EncryptedEnvelope;
      try {
        envelope = JSON.parse(jsonInput);
      } catch (parseError) {
        throw new Error("El texto ingresado no es un JSON válido. Asegúrate de copiar el bloque completo.");
      }

      // 2. Verificamos que contenga los campos requeridos por el backend
      if (!envelope.encryptedPayload || !envelope.encryptedDataKey) {
        throw new Error("El formato del JSON es incorrecto. Faltan los campos 'encryptedPayload' o 'encryptedDataKey'.");
      }

      // 3. Enviamos la trama al Sistema C para interactuar con KMS
      const result = await decryptPayload(envelope);

      // 4. Almacenamos el resultado en texto plano
      setDecryptedResult(result.payload);
    } catch (error: any) {
      setKmsError(error.message || "Error al desencriptar. Verifica la comunicación con el backend.");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-500 space-y-8 px-4">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Panel de Administración</h1>
        <p className="text-muted-foreground mt-1">
          Herramienta criptográfica para la recepción y descifrado de información.
        </p>
      </div>

      {/* Tarjeta del Desencriptador */}
      <Card className="border-emerald-200 shadow-sm">
        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
            <Unlock className="h-5 w-5 text-emerald-600" />
            Descifrado KMS (Desde Sistema A)
          </CardTitle>
          <CardDescription>
            Pega el objeto JSON cifrado enviado por el Sistema A para procesar su contenido original.
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
            {isDecrypting ? "Procesando descifrado..." : "Descifrar Trama"}
          </Button>

          {kmsError && (
            <div className="p-3 mt-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 font-medium">
              {kmsError}
            </div>
          )}

          {/* Bloque de salida con el texto plano */}
          {decryptedResult && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Mensaje original descifrado:
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
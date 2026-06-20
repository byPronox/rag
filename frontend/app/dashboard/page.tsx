"use client"

import { useState } from "react"
// Importamos ambas funciones de la API utilitaria
import { encryptPayload, decryptPayload, EncryptedEnvelope } from "@/lib/api/kms"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, Unlock } from "lucide-react"

export default function UserDashboardPage() {
  // Estados para la sección de Cifrado
  const [encryptInput, setEncryptInput] = useState("")
  const [encryptedResult, setEncryptedResult] = useState("")
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [encryptError, setEncryptError] = useState("")

  // Estados para la sección de Descifrado
  const [decryptInput, setDecryptInput] = useState("")
  const [decryptedResult, setDecryptedResult] = useState("")
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptError, setDecryptError] = useState("")

  // Ejecución del flujo de Cifrado
  const handleEncrypt = async () => {
    if (!encryptInput.trim()) return;

    setIsEncrypting(true);
    setEncryptError("");
    setEncryptedResult("");

    try {
      const result = await encryptPayload(encryptInput);
      setEncryptedResult(JSON.stringify(result, null, 2));
    } catch (error: any) {
      setEncryptError("Error al encriptar. Verifica la conexión con el Sistema C.");
    } finally {
      setIsEncrypting(false);
    }
  };

  // Ejecución del flujo de Descifrado
  const handleDecrypt = async () => {
    if (!decryptInput.trim()) return;

    setIsDecrypting(true);
    setDecryptError("");
    setDecryptedResult("");

    try {
      // 1. Parsear el input a un formato JSON estructurado
      let envelope: EncryptedEnvelope;
      try {
        envelope = JSON.parse(decryptInput);
      } catch (e) {
        throw new Error("El formato ingresado no corresponde a un objeto JSON válido.");
      }

      // 2. Validar presencia de propiedades obligatorias de sobre criptográfico
      if (!envelope.encryptedPayload || !envelope.encryptedDataKey) {
        throw new Error("Estructura JSON incompleta (faltan 'encryptedPayload' o 'encryptedDataKey').");
      }

      // 3. Consumir el endpoint de descifrado directo
      const result = await decryptPayload(envelope);
      setDecryptedResult(result.payload);
    } catch (error: any) {
      setDecryptError(error.message || "Error al desencriptar. Asegúrate de conservar la sesión activa.");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-500 space-y-8 px-4">
      {/* Encabezado Principal */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard de Operaciones KMS</h1>
        <p className="text-muted-foreground mt-1">
          Espacio integrado para pruebas criptográficas asíncronas basadas en contextos de identidad compartida.
        </p>
      </div>

      {/* TARJETA 1: CIFRADO KMS */}
      <Card className="border-indigo-200 shadow-sm">
        <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
          <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
            <Lock className="h-5 w-5 text-indigo-600" />
            Cifrado KMS (Hacia Sistema A)
          </CardTitle>
          <CardDescription>
            Escribe un mensaje para encriptarlo y generar el paquete criptográfico compatible.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <textarea
            className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Escribe el mensaje secreto aquí..."
            value={encryptInput}
            onChange={(e) => setEncryptInput(e.target.value)}
          />

          <Button
            onClick={handleEncrypt}
            disabled={isEncrypting || !encryptInput.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2"
          >
            {isEncrypting ? "Procesando cifrado..." : "Generar Trama Encriptada"}
          </Button>

          {encryptError && (
            <div className="p-3 mt-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {encryptError}
            </div>
          )}

          {encryptedResult && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Copia este JSON resultado:
              </p>
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-md text-sm overflow-auto max-h-[180px] font-mono">
                {encryptedResult}
              </pre>
              <Button
                variant="outline"
                className="w-full mt-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                onClick={() => {
                  navigator.clipboard.writeText(encryptedResult);
                  alert("¡JSON copiado al portapapeles exitosamente!");
                }}
              >
                Copiar JSON al Portapapeles
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TARJETA 2: DESCIFRADO KMS (REQUISITO RECIENTE) */}
      <Card className="border-emerald-200 shadow-sm">
        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
            <Unlock className="h-5 w-5 text-emerald-600" />
            Descifrado KMS (Desde Sistema A)
          </CardTitle>
          <CardDescription>
            Pega el sobre JSON cifrado recibido del Sistema A para restaurar la información original vía AWS KMS.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <textarea
            className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            placeholder='{"encryptedPayload": "...", "encryptedDataKey": "..."}'
            value={decryptInput}
            onChange={(e) => setDecryptInput(e.target.value)}
          />

          <Button
            onClick={handleDecrypt}
            disabled={isDecrypting || !decryptInput.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2"
          >
            {isDecrypting ? "Procesando descifrado..." : "Descifrar Trama"}
          </Button>

          {decryptError && (
            <div className="p-3 mt-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {decryptError}
            </div>
          )}

          {decryptedResult && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Texto en plano recuperado exitosamente:
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
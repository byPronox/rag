"use client"

import { useState } from "react"
import { encryptPayload } from "@/lib/api/kms"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

export default function UserDashboardPage() {
  const [encryptInput, setEncryptInput] = useState("")
  const [encryptedResult, setEncryptedResult] = useState("")
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [kmsError, setKmsError] = useState("")

  const handleEncrypt = async () => {
    if (!encryptInput.trim()) return;

    setIsEncrypting(true);
    setKmsError("");
    setEncryptedResult("");

    try {
      const result = await encryptPayload(encryptInput);
      setEncryptedResult(JSON.stringify(result, null, 2));
    } catch (error: any) {
      setKmsError("Error al encriptar. Verifica la conexión con el Sistema C.");
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-500 space-y-8 px-4">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard de Usuario</h1>
        <p className="text-muted-foreground mt-1">
          Herramienta de cifrado seguro utilizando el servicio KMS.
        </p>
      </div>

      {/* Tarjeta Cifrado KMS */}
      <Card className="border-indigo-200 shadow-sm">
        <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
          <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
            <Lock className="h-5 w-5 text-indigo-600" />
            Cifrado KMS (Hacia Sistema A)
          </CardTitle>
          <CardDescription>
            Escribe un mensaje para encriptarlo y enviarlo de forma segura al Sistema A.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <textarea
            className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

          {kmsError && (
            <div className="p-3 mt-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {kmsError}
            </div>
          )}

          {/* Bloque de salida */}
          {encryptedResult && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Copia este JSON y pégalo en el Sistema A:
              </p>
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-md text-sm overflow-auto max-h-[250px] font-mono">
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
    </div>
  )
}
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { InteractiveParticles } from "@/components/ui/interactive-particles"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isAuthenticated, loaded } = useAuth()

  useEffect(() => {
    if (loaded && isAuthenticated) {
      // Todos los usuarios (incluso los Admins de Cognito) van al dashboard por defecto
      // para que actúen como usuarios normales en tu sistema RAG.
      router.push("/dashboard")
    }
  }, [loaded, isAuthenticated, router])

  if (!loaded || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel Izquierdo - Mantenemos tu UI intacta */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #3730a3 60%, #1e1b4b 100%)' }}>
        <InteractiveParticles />
        <div className="relative z-10 flex flex-col w-full p-10 pointer-events-none">
          <div className="flex-1 flex items-center justify-center">
            <Image src="/images/login-illustration.svg" alt="Illustration" width={450} height={360} className="w-full h-auto drop-shadow-2xl" priority />
          </div>
        </div>
      </div>

      {/* Panel Derecho - Solo el botón de SSO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-[var(--on-surface)] mb-2">Welcome back</h1>
          <p className="text-[var(--on-surface-variant)] mb-10">
            Inicia sesión usando la identidad central del sistema.
          </p>

          <Button
            onClick={() => signIn("/dashboard")}
            className="w-full h-12 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center shadow-lg"
          >
            Iniciar Sesión (SSO)
          </Button>
        </div>
      </div>
    </div>
  )
}
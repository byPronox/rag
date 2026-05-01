"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { login as apiLogin } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function LoginPage() {
  const router = useRouter()
  // Extraemos variables adicionales del contexto
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // NUEVO: Redirección automática si ya está logueado
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    }
  }, [authLoading, isAuthenticated, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await apiLogin(email, password)
      
      // CAMBIO AQUÍ: Ahora solo le pasamos el usuario al contexto
      // El token ya está guardado de forma segura en la cookie por el navegador
      login(response.user) 
      
      // Redirect based on user role
      if (response.user.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  // NUEVO: Mientras verifica la sesión, muestra el spinner en vez del form
  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] min-h-screen flex items-center justify-center p-4 antialiased">
      <main className="w-full max-w-sm bg-white rounded-xl border border-[var(--outline-variant)]/30 p-8 shadow-[0_12px_24px_rgba(17,24,39,0.04)]">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--surface-container-low)] mb-6">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--on-surface)] mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">
            Sign in to RAG Intelligence
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="text-xs font-medium text-[var(--on-surface-variant)] tracking-wide"
            >
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-[var(--outline-variant)] rounded-lg px-4 py-2.5 text-sm text-[var(--on-surface)] placeholder:text-[var(--outline)] focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label
                htmlFor="password"
                className="text-xs font-medium text-[var(--on-surface-variant)] tracking-wide"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-[var(--outline-variant)] rounded-lg px-4 py-2.5 text-sm text-[var(--on-surface)] placeholder:text-[var(--outline)] focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white font-medium text-sm py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center mt-1 shadow-sm disabled:opacity-70"
          >
            {isLoading ? <Spinner className="w-4 h-4" /> : "Sign in"}
          </Button>
        </form>

        {/* Footer Modificado */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--on-surface-variant)]">
            Don&apos;t have an account?{" "}
            <a
              href="mailto:support@raginteligence.com"
              className="text-primary hover:text-primary/80 font-medium ml-1 transition-colors"
            >
              Contact us
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { register as apiRegister } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    setIsLoading(true)

    try {
      await apiRegister(email, password)
      router.push("/login?registered=true")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar usuario")
    } finally {
      setIsLoading(false)
    }
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--on-surface)] mb-2">
            Create account
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">
            Get started with RAG Intelligence
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            <label
              htmlFor="password"
              className="text-xs font-medium text-[var(--on-surface-variant)] tracking-wide"
            >
              Password
            </label>
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
            <p className="text-xs text-[var(--on-surface-variant)] mt-1">
              Minimum 8 characters
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-medium text-[var(--on-surface-variant)] tracking-wide"
            >
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white border border-[var(--outline-variant)] rounded-lg px-4 py-2.5 text-sm text-[var(--on-surface)] placeholder:text-[var(--outline)] focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white font-medium text-sm py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center mt-2 shadow-sm disabled:opacity-70"
          >
            {isLoading ? <Spinner className="w-4 h-4" /> : "Create account"}
          </Button>

          <p className="text-xs text-center text-[var(--on-surface-variant)]">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--on-surface-variant)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary/80 font-medium ml-1 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

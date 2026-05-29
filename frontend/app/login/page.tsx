"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { login as apiLogin } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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
      login(response.user)
      
      if (response.user.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesion")
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative lines */}
        <div className="absolute top-20 left-10 w-32 h-[1px] bg-white/20 rotate-45" />
        <div className="absolute top-40 right-20 w-24 h-[1px] bg-white/20 -rotate-12" />
        <div className="absolute bottom-32 left-20 w-40 h-[1px] bg-white/20 rotate-12" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-white font-semibold text-xl">RAG Intelligence</span>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-8">
            {/* Illustration */}
            <div className="w-full max-w-md mb-10">
              <Image
                src="/images/login-illustration.png"
                alt="AI Document Analysis Illustration"
                width={400}
                height={300}
                className="w-full h-auto drop-shadow-2xl"
                priority
              />
            </div>

            {/* Welcome Text */}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">
                Welcome to
                <br />
                RAG Intelligence
              </h2>
              <p className="text-white/80 text-lg max-w-sm leading-relaxed">
                Analyze your documents with AI. Get instant insights and answers from your data.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-white/60 text-sm">
            &copy; {new Date().getFullYear()} RAG Intelligence. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo - Only visible on small screens */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-[var(--on-surface)] font-semibold text-xl">RAG Intelligence</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-[var(--on-surface)] mb-2">
              Welcome Back!
            </h1>
            <p className="text-[var(--on-surface-variant)]">
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[var(--on-surface)]"
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
                className="w-full h-12 bg-[var(--surface)] border border-[var(--outline-variant)] rounded-lg px-4 text-[var(--on-surface)] placeholder:text-[var(--outline)] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[var(--on-surface)]"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 bg-[var(--surface)] border border-[var(--outline-variant)] rounded-lg px-4 text-[var(--on-surface)] placeholder:text-[var(--outline)] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center shadow-lg shadow-primary/25 disabled:opacity-70"
            >
              {isLoading ? <Spinner className="w-5 h-5" /> : "Sign in"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-[var(--on-surface-variant)]">
              {"Don't have an account?"}{" "}
              <a
                href="mailto:support@raginteligence.com"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Contact us
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

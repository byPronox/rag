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
      setError(err instanceof Error ? err.message : "Failed to sign in")
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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #3730a3 60%, #1e1b4b 100%)' }}>
        {/* Animated particles/dots background */}
        <div className="absolute inset-0">
          {/* Large glowing orbs */}
          <div className="absolute top-[20%] left-[15%] w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-[50%] right-[30%] w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
          
          {/* Scattered dots/particles */}
          <div className="absolute inset-0">
            {/* Top area dots */}
            <div className="absolute top-[8%] left-[20%] w-1.5 h-1.5 bg-indigo-300/40 rounded-full" />
            <div className="absolute top-[12%] left-[35%] w-1 h-1 bg-indigo-400/30 rounded-full" />
            <div className="absolute top-[15%] right-[25%] w-2 h-2 bg-indigo-300/20 rounded-full" />
            <div className="absolute top-[20%] right-[15%] w-1 h-1 bg-violet-400/40 rounded-full" />
            <div className="absolute top-[10%] right-[40%] w-1.5 h-1.5 bg-blue-300/30 rounded-full" />
            
            {/* Middle area dots */}
            <div className="absolute top-[35%] left-[8%] w-1 h-1 bg-indigo-400/30 rounded-full" />
            <div className="absolute top-[40%] left-[25%] w-2 h-2 bg-violet-300/20 rounded-full" />
            <div className="absolute top-[45%] right-[8%] w-1.5 h-1.5 bg-indigo-300/40 rounded-full" />
            <div className="absolute top-[50%] right-[20%] w-1 h-1 bg-blue-400/30 rounded-full" />
            <div className="absolute top-[38%] right-[35%] w-1 h-1 bg-violet-400/25 rounded-full" />
            
            {/* Bottom area dots */}
            <div className="absolute bottom-[30%] left-[12%] w-1.5 h-1.5 bg-indigo-300/30 rounded-full" />
            <div className="absolute bottom-[25%] left-[30%] w-1 h-1 bg-violet-400/40 rounded-full" />
            <div className="absolute bottom-[35%] right-[12%] w-2 h-2 bg-indigo-300/20 rounded-full" />
            <div className="absolute bottom-[20%] right-[30%] w-1 h-1 bg-blue-300/35 rounded-full" />
            <div className="absolute bottom-[15%] left-[45%] w-1.5 h-1.5 bg-violet-300/30 rounded-full" />
            <div className="absolute bottom-[8%] right-[45%] w-1 h-1 bg-indigo-400/25 rounded-full" />
            
            {/* Extra scattered dots */}
            <div className="absolute top-[60%] left-[5%] w-1 h-1 bg-indigo-300/20 rounded-full" />
            <div className="absolute top-[70%] right-[5%] w-1.5 h-1.5 bg-violet-300/30 rounded-full" />
            <div className="absolute top-[25%] left-[5%] w-1 h-1 bg-blue-400/25 rounded-full" />
            <div className="absolute bottom-[45%] right-[3%] w-1 h-1 bg-indigo-400/35 rounded-full" />
          </div>
          
          {/* Subtle grid lines */}
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col w-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">RAG Intelligence</span>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex items-center justify-center">
            {/* Illustration Container */}
            <div className="w-full max-w-md">
              <Image
                src="/images/login-illustration.svg"
                alt="Focused Developer Illustration"
                width={450}
                height={360}
                className="w-full h-auto drop-shadow-2xl"
                priority
              />
            </div>
          </div>

          {/* Footer */}
          <div className="text-indigo-300/50 text-sm">
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
              Welcome back
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

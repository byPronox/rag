"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
// Según tu estructura de carpetas, estos deberían ser tus componentes de usuario:
import { UserSidebar } from "@/components/user/user-sidebar"
import { UserHeader } from "@/components/user/user-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 1. Extraemos 'loaded' en lugar de 'isLoading'
  const { isAuthenticated, loaded } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    // 2. Si ya cargó la sesión y no está logueado, lo pateamos al login
    if (loaded) {
      if (!isAuthenticated) {
        router.push("/login")
      }
      // No validamos rol aquí: cualquier usuario autenticado (sea admin o no) 
      // tiene derecho a ver el dashboard de RAG.
    }
  }, [isAuthenticated, loaded, router])

  // 3. Mientras la sesión esté cargando (!loaded) mostramos el Skeleton
  if (!loaded) {
    return (
      <div className="min-h-screen flex bg-background w-full">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 border-r border-border p-6 gap-6 fixed h-full bg-card">
          <Skeleton className="h-8 w-40 mt-2" />
          <div className="space-y-4 mt-8">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </div>
        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col md:pl-64">
          <header className="h-16 border-b border-border flex items-center px-6 bg-card">
            <Skeleton className="h-6 w-32" />
          </header>
          <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
            <Skeleton className="h-[400px] w-full mt-6" />
          </main>
        </div>
      </div>
    )
  }

  // 4. Si terminó de cargar y no está autenticado, no renderiza nada (el useEffect lo redirige)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar de Usuario Normal */}
      <UserSidebar />

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <UserHeader
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
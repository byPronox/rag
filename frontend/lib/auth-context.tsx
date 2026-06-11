"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { apiGet, apiPost, AUTH_ENDPOINTS } from "./api" // Ajusta la ruta si es necesario

export interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  api_key?: string;
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  isLoggingOut: boolean
  user: User | null
  login: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // Al recargar la página, preguntamos al backend si la cookie sigue activa
    const checkSession = async () => {
      try {
        const userData = await apiGet<User>(AUTH_ENDPOINTS.me)
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        // Si hay error (401), la cookie expiró o no existe
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkSession()
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    setIsAuthenticated(true)
  }

  const logout = async () => {
    setIsLoggingOut(true)
    try {
      // Llamamos al backend para que destruya la cookie
      await apiPost(`${AUTH_ENDPOINTS.me.replace('/me', '/logout')}`, {}) 
    } catch (e) {
      console.error("Error al cerrar sesión", e)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      router.push("/login")
      setTimeout(() => setIsLoggingOut(false), 500)
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, isLoggingOut, user, login, logout }}>
      {isLoggingOut && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center justify-center gap-4 bg-card px-8 py-6 rounded-2xl shadow-2xl border border-border animate-in zoom-in-95 duration-300">
            <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-foreground font-medium text-sm animate-pulse">Logging out...</p>
          </div>
        </div>,
        document.body
      )}
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
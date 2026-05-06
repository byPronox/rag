"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
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
  user: User | null
  login: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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
    try {
      // Llamamos al backend para que destruya la cookie
      await apiPost(`${AUTH_ENDPOINTS.me.replace('/me', '/logout')}`, {}) 
    } catch (e) {
      console.error("Error al cerrar sesión", e)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
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
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface User {
  id: number
  email: string
  role: "admin" | "user"
  is_active: boolean
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper to decode JWT payload
function decodeJWT(token: string): { sub: string; exp: number } | null {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token and user on mount
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("rag_token") : null
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("rag_user") : null
    
    if (storedToken && storedUser) {
      // Verify token is not expired
      const payload = decodeJWT(storedToken)
      if (payload && payload.exp * 1000 > Date.now()) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
        setIsAuthenticated(true)
      } else {
        // Token expired, clear storage
        localStorage.removeItem("rag_token")
        localStorage.removeItem("rag_user")
      }
    }
    setIsLoading(false)
  }, [])

  const login = (newToken: string, userData: User) => {
    localStorage.setItem("rag_token", newToken)
    localStorage.setItem("rag_user", JSON.stringify(userData))
    setToken(newToken)
    setUser(userData)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem("rag_token")
    localStorage.removeItem("rag_user")
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, token, user, login, logout }}>
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

"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { User, Shield, LayoutDashboard, LogOut } from "lucide-react"

export function UserMenu() {
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cierra el menú si haces clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    router.push("/login")
  }

  // Mientras carga la sesión, mostramos un esqueleto o nada
  if (isLoading) return <div className="size-9 rounded-full bg-muted animate-pulse" />

  // Si no está autenticado, mostramos el botón de login genérico
  if (!isAuthenticated || !user) {
    return (
      <Link 
        href="/login" 
        className="inline-flex items-center justify-center gap-2 text-sm font-medium size-9 hover:text-primary/80 transition-colors duration-200 rounded-full hover:bg-[var(--surface-container)]"
      >
        <User className="w-5 h-5" />
      </Link>
    )
  }

  // Lógica para obtener iniciales del correo (ej: "stefanjativa@gmail.com" -> "ST")
  const initials = user.email ? user.email.substring(0, 2).toUpperCase() : "U"

  return (
    <div className="relative" ref={menuRef}>
      {/* El Avatar que se puede clickear */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none"
      >
        {initials}
      </button>

      {/* El Menú Desplegable (Hamburger Box) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-card text-card-foreground shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-3 border-b border-border/50">
            <p className="text-sm font-medium leading-none text-foreground truncate">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              Rol: {user.role}
            </p>
          </div>
          
          <div className="p-1">
            {/* Opción Admin Panel (Solo visible si es admin) */}
            {user.role === "admin" && (
              <Link 
                href="/admin" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              >
                <Shield className="w-4 h-4 text-primary" />
                Admin Panel
              </Link>
            )}

            {/* Opción Dashboard (Visible para todos) */}
            <Link 
              href="/dashboard" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-primary" />
              Dashboard
            </Link>

            <div className="h-px bg-border/50 my-1 mx-2" />

            {/* Opción Logout */}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
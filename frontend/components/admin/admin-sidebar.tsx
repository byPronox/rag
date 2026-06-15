"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Users,
  BarChart3,
  Brain,
  History,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Metrics", href: "/admin/metrics", icon: BarChart3 },
  { name: "AI Models", href: "/admin/models", icon: Brain },
  { name: "Audit Logs", href: "/admin/logs", icon: History },
]

const secondaryNavigation = [
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  // 1. Extraemos signOut en lugar de logout
  const { signOut, user } = useAuth()

  // 2. Estado local para manejar la UI de "Cerrando sesión"
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error("Error al cerrar sesión", error)
      setIsLoggingOut(false)
    }
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-card border-r border-border pt-5 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 mb-8 mt-2">
          <div>
            <Link href="/" className="font-semibold text-lg tracking-tight text-foreground hover:opacity-80 transition-opacity">
              RAG Intelligence
            </Link>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="px-3 mt-auto border-t border-border pt-4 pb-4 space-y-1">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>

          {/* User info */}
          <div className="px-4 pt-4 mt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
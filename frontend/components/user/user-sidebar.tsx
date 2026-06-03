"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  PackageSearch,
  MessageSquare,
  SearchCode,
  History,
  Settings,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Exported Products", href: "/dashboard/products", icon: PackageSearch },
  { name: "Configure Chatbot", href: "/dashboard/chatbot", icon: MessageSquare },
  { name: "Search Bar", href: "/dashboard/search", icon: SearchCode },
  { name: "History", href: "/dashboard/history", icon: History },
]

const secondaryNavigation = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function UserSidebar() {
  const pathname = usePathname()
  const { logout, user, isLoggingOut } = useAuth()

  const handleLogout = () => {
    logout()
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
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">User Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
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
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
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
            Logout
          </button>

          {/* User info */}
          <div className="px-4 pt-4 mt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium text-foreground truncate">{user?.email || "stefanjativa2@gmail.com"}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
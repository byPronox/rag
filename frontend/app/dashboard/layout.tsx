"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { UserSidebar } from "@/components/user/user-sidebar"
import { UserHeader } from "@/components/user/user-header"
import { Spinner } from "@/components/ui/spinner"

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login")
      } else if (user?.role === "admin") {
        // Redirect admin users back to admin dashboard
        router.push("/admin")
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || user?.role === "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
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
          title="Overview"
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
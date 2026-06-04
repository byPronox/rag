"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { UserSidebar } from "@/components/user/user-sidebar"
import { UserHeader } from "@/components/user/user-header"
import { CompanyProvider } from "@/lib/company-context"
import { Skeleton } from "@/components/ui/skeleton"

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
      <div className="min-h-screen flex bg-background w-full">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 border-r border-border p-6 gap-6 fixed h-full bg-card">
           <Skeleton className="h-8 w-40 mt-2" />
           <div className="space-y-4 mt-8">
             {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                 {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
              <Skeleton className="h-[400px] w-full mt-6" />
           </main>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role === "admin") {
    return null
  }

  return (
    // Envolvemos todo en el CompanyProvider para el estado global
    <CompanyProvider>
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
    </CompanyProvider>
  )
}
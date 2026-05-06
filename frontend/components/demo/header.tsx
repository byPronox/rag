"use client"

import Link from "next/link"
import { Store, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserMenu } from "@/components/user-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function DemoHeader() {
  const { user } = useAuth()
  const { companies, activeCompany, setActiveCompanyId, isLoadingCompanies } = useCompany()

  // Agrupar compañías por plataforma para el Select
  const groupedCompanies = companies.reduce((acc, company) => {
    const plat = company.platform.toUpperCase()
    if (!acc[plat]) acc[plat] = []
    acc[plat].push(company)
    return acc
  }, {} as Record<string, typeof companies>)

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-[var(--outline-variant)]/30 flex justify-between items-center w-full px-6 py-3 h-16 sticky top-0 z-50 antialiased">
      {/* Left Section: Logo & Company Selector */}
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-[var(--on-surface)] hover:opacity-80 transition-opacity">
          RAG Intelligence
        </Link>
        
        {/* Selector de Compañía (Solo si está logueado) */}
        {user && (
          <div className="hidden md:flex items-center gap-2 border-l border-border pl-6">
            <Store className="h-4 w-4 text-muted-foreground" />
            <Select 
              disabled={isLoadingCompanies || companies.length === 0} 
              value={activeCompany?.company_id || ""} 
              onValueChange={setActiveCompanyId}
            >
              <SelectTrigger className="w-[200px] h-9 bg-[var(--surface-container-low)] border-[var(--outline-variant)] rounded-full">
                <SelectValue placeholder={isLoadingCompanies ? "Cargando..." : "Selecciona una sucursal"} />
              </SelectTrigger>
              <SelectContent>
                {companies.length === 0 && !isLoadingCompanies ? (
                  <SelectItem value="none" disabled>Sin compañías sincronizadas</SelectItem>
                ) : (
                  Object.entries(groupedCompanies).map(([platform, platCompanies]) => (
                    <SelectGroup key={platform}>
                      <SelectLabel className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                        {platform}
                      </SelectLabel>
                      {platCompanies.map((c) => (
                        <SelectItem key={c.company_id} value={c.company_id} className="cursor-pointer">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {/* Right Section: User Menu / Login Avatar */}
      <div className="flex items-center gap-2 text-primary">
        {user ? (
          <UserMenu />
        ) : (
          <Link href="/login" className="hover:opacity-80 transition-opacity" title="Iniciar Sesión">
            <Avatar className="h-8 w-8 border border-primary/20 transition-transform hover:scale-105">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </Link>
        )}
      </div>
    </header>
  )
}
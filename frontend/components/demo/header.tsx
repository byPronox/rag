"use client"

import Link from "next/link"
import { Bell, BellOff, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserMenu } from "@/components/user-menu"

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
      
      {/* Right Section: Trailing Icons */}
      <div className="flex items-center gap-2 text-primary">
        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:text-primary/80 transition-colors duration-200 rounded-full hover:bg-[var(--surface-container)]"
            >
              <Bell className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-72 p-4 bg-white border border-[var(--outline-variant)]/30 shadow-lg rounded-xl"
          >
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-container-low)] flex items-center justify-center mb-3">
                <BellOff className="w-5 h-5 text-[var(--on-surface-variant)]" />
              </div>
              <p className="text-sm font-medium text-[var(--on-surface)]">
                No notifications yet
              </p>
              <p className="text-xs text-[var(--on-surface-variant)] mt-1">
                We'll notify you when something arrives
              </p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Componente Dinámico de Usuario */}
        <UserMenu />
        
      </div>
    </header>
  )
}
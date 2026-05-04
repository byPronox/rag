"use client"

import { Bell, HelpCircle, Menu, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context" // <--- IMPORTAMOS EL NUEVO CONTEXTO

interface UserHeaderProps {
  title?: string
  onMenuClick?: () => void
}

export function UserHeader({ title = "User Dashboard", onMenuClick }: UserHeaderProps) {
  const { user } = useAuth()
  const { companies, activeCompany, setActiveCompanyId, isLoadingCompanies } = useCompany()

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  // Agrupamos las compañías por plataforma (ej. { odoo: [comp1, comp2], shopify: [comp3] })
  const groupedCompanies = companies.reduce((acc, company) => {
    const plat = company.platform.toUpperCase()
    if (!acc[plat]) acc[plat] = []
    acc[plat].push(company)
    return acc
  }, {} as Record<string, typeof companies>)

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4 md:gap-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h2 className="text-lg font-semibold text-foreground hidden lg:block">{title}</h2>
        
        {/* EL SELECTOR GLOBAL DE COMPAÑÍAS */}
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select 
            disabled={isLoadingCompanies || companies.length === 0} 
            value={activeCompany?.company_id || ""} 
            onValueChange={setActiveCompanyId}
          >
            <SelectTrigger className="w-[200px] sm:w-[240px] h-9 bg-muted/30 border-border">
              <SelectValue placeholder={isLoadingCompanies ? "Cargando..." : "Selecciona una sucursal"} />
            </SelectTrigger>
            <SelectContent>
              {companies.length === 0 && !isLoadingCompanies ? (
                <SelectItem value="none" disabled>No hay compañías (Sincroniza en Odoo)</SelectItem>
              ) : (
                Object.entries(groupedCompanies).map(([platform, platCompanies]) => (
                  <SelectGroup key={platform}>
                    <SelectLabel className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                      Platform: {platform}
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
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative hidden sm:flex">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
        </Button>

        {/* Help */}
        <Button variant="ghost" size="icon" className="hidden sm:flex">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Avatar */}
        <Avatar className="h-8 w-8 border border-border ml-2">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            {user?.email ? getInitials(user.email) : "US"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
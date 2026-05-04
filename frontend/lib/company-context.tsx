"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { getUserCompanies, Company } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface CompanyContextType {
  companies: Company[]
  activeCompany: Company | null
  isLoadingCompanies: boolean
  setActiveCompanyId: (id: string) => void
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompany, setActiveCompany] = useState<Company | null>(null)
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true)

  useEffect(() => {
    // Solo cargamos las compañías si el usuario está logueado
    if (user) {
      setIsLoadingCompanies(true)
      getUserCompanies()
        .then((data) => {
          setCompanies(data)
          // SELECCIÓN AUTOMÁTICA: Si hay compañías y no hay ninguna seleccionada, elige la primera
          if (data.length > 0 && !activeCompany) {
            setActiveCompany(data[0])
          }
        })
        .catch((err) => console.error("Error fetching companies:", err))
        .finally(() => setIsLoadingCompanies(false))
    }
  }, [user]) // Se ejecuta cuando el usuario hace login

  const setActiveCompanyId = (id: string) => {
    const selected = companies.find((c) => c.company_id === id)
    if (selected) {
      setActiveCompany(selected)
    }
  }

  return (
    <CompanyContext.Provider value={{ companies, activeCompany, isLoadingCompanies, setActiveCompanyId }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}
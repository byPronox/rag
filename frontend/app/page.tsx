"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { testSemanticSearch, SearchResult } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { Spinner } from "@/components/ui/spinner"

import { DemoHeader } from "@/components/demo/header"
import { SearchHero } from "@/components/demo/search-hero"
import { ProductGrid } from "@/components/demo/product-grid"
import { ChatWidget } from "@/components/demo/chat-widget"

export default function DemoPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { activeCompany, isLoadingCompanies } = useCompany()

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Redirección si no está logueado
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isAuthLoading, router])

  const handleSearch = async (query: string) => {
    if (!activeCompany) {
      alert("Por favor selecciona una compañía en el menú superior primero.");
      return;
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      // Mock de la llave (Asegúrate de cambiarlo por la real desde tu backend o Auth)
      const apiKey = "your_master_api_key_here";
      const results = await testSemanticSearch(query, activeCompany.company_id, apiKey)
      setSearchResults(results)
    } catch (error) {
      console.error("[RAG Error] Falló la búsqueda:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Pantalla de carga mientras valida la sesión
  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <DemoHeader />
      
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 py-8 flex flex-col gap-8">
        {!activeCompany && !isLoadingCompanies ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <h2 className="text-3xl font-bold mb-4">Bienvenido a tu Live Preview</h2>
            <p className="text-muted-foreground text-lg max-w-xl">
              Selecciona una sucursal desde el menú superior para empezar a probar la IA con tus productos reales.
            </p>
          </div>
        ) : (
          <>
            <SearchHero onSearch={handleSearch} />
            <ProductGrid 
              products={searchResults} 
              isSearching={isSearching} 
              hasSearched={hasSearched} 
            />
          </>
        )}
      </main>
      
      {/* El Chatbot solo aparece si hay una compañía seleccionada */}
      {activeCompany && <ChatWidget />}
    </div>
  )
}
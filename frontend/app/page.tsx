"use client"

import { useState } from "react"
import { testSemanticSearch, SearchResult } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { Spinner } from "@/components/ui/spinner"

import { DemoHeader } from "@/components/demo/header"
import { SearchHero } from "@/components/demo/search-hero"
import { ProductGrid } from "@/components/demo/product-grid"
import { ChatWidget } from "@/components/demo/chat-widget"

export default function DemoPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { activeCompany } = useCompany()

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (query: string) => {
    setIsSearching(true)
    setHasSearched(true)

    // Si no está logueado o no ha seleccionado compañía, hacemos una "Demo Search"
    if (!isAuthenticated || !activeCompany) {
      setTimeout(() => {
        setIsSearching(false)
        setHasSearched(false) // Lo devolvemos a false para que se sigan viendo los demoProducts
        alert("¡Estás en modo demostración! Para buscar en tu catálogo real con IA, inicia sesión y selecciona tu compañía.")
      }, 1500)
      return
    }

    // Búsqueda Real en el Microservicio 3
    try {
      const apiKey = "your_master_api_key_here"; // Reemplaza por la lógica para traer la API Key
      const results = await testSemanticSearch(query, activeCompany.company_id, apiKey)
      setSearchResults(results)
    } catch (error) {
      console.error("[RAG Error] Búsqueda fallida:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  if (isAuthLoading) {
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
        <SearchHero onSearch={handleSearch} />
        
        <ProductGrid 
          products={searchResults} 
          isSearching={isSearching} 
          hasSearched={hasSearched} 
        />
      </main>
      
      <ChatWidget />
    </div>
  )
}
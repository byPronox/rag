"use client"

import { useState, useRef, useEffect } from "react"
import { testSemanticSearch, SearchResult } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { Spinner } from "@/components/ui/spinner"

import { DemoHeader } from "@/components/demo/header"
import { SearchHero } from "@/components/demo/search-hero"
import { ProductGrid } from "@/components/demo/product-grid"
import { ChatWidget } from "@/components/demo/chat-widget"

export default function DemoPage() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth()
  const { activeCompany } = useCompany()

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showAuthCTA, setShowAuthCTA] = useState(false)
  const sessionIdRef = useRef<string>("")

  useEffect(() => {
    sessionIdRef.current = 'demo_search_' + Date.now()
  }, [])

  const handleSearch = async (query: string) => {
    setIsSearching(true)
    setHasSearched(true)
    setShowAuthCTA(false)

    // Unauthenticated Flow: Show skeleton, then the Login CTA
    if (!isAuthenticated) {
      setTimeout(() => {
        setIsSearching(false)
        setShowAuthCTA(true)
      }, 1500) // 1.5s Shimmer effect delay
      return
    }

    // Authenticated Flow but no company selected
    if (!activeCompany) {
      setTimeout(() => {
        setIsSearching(false)
        alert("Please select a company from the top menu to test your real catalog.")
      }, 500)
      return
    }

    try {
      const userApiKey = (user as any)?.api_key;
      
      if (!userApiKey) {
        console.error("[RAG Error] No API Key found for this user");
        alert("Error de sesión: No se detectó tu API Key. Cierra sesión y vuelve a entrar.");
        setSearchResults([]);
        return;
      }

      // Pasamos la llave real al Microservicio 3
      const results = await testSemanticSearch(query, activeCompany.company_id, userApiKey, sessionIdRef.current)
      setSearchResults(results)
    } catch (error) {
      console.error("[RAG Error] Search failed:", error)
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
          showAuthCTA={showAuthCTA}
        />
      </main>
      
      <ChatWidget />
    </div>
  )
}
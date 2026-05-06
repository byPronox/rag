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
  const [showAuthCTA, setShowAuthCTA] = useState(false)

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

    // Real Search Flow (Logged in & Company selected)
    try {
      const apiKey = "your_master_api_key_here"; // Replace with real logic
      const results = await testSemanticSearch(query, activeCompany.company_id, apiKey)
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
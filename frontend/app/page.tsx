"use client"

import { DemoHeader } from "@/components/demo/header"
import { SearchHero } from "@/components/demo/search-hero"
import { ProductGrid } from "@/components/demo/product-grid"
import { ChatWidget } from "@/components/demo/chat-widget"

export default function DemoPage() {
  const handleSearch = (query: string) => {
    console.log("[v0] Search query:", query)
    // TODO: Integrate with RAG API POST /api/v1/search/
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <DemoHeader />
      
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 py-8 flex flex-col gap-8">
        <SearchHero onSearch={handleSearch} />
        <ProductGrid />
      </main>
      
      <ChatWidget />
    </div>
  )
}

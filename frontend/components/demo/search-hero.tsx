"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchHeroProps {
  onSearch?: (query: string) => void
}

export function SearchHero({ onSearch }: SearchHeroProps) {
  const [query, setQuery] = useState("")
  
  const suggestedQueries = [
    "Ergonomic seating",
    "Noise-cancelling headphones", 
    "Cable management"
  ]
  
  const handleSearch = () => {
    if (query.trim() && onSearch) {
      onSearch(query)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <section className="flex flex-col items-center justify-center py-8 mt-6">
      <h1 className="text-3xl font-semibold text-[var(--on-surface)] mb-4 text-center max-w-2xl tracking-tight leading-tight">
        What are you looking for today?
      </h1>
      <p className="text-base text-[var(--on-surface-variant)] mb-8 text-center max-w-xl leading-relaxed">
        Describe the exact product, vibe, or utility you need. Our AI understands context, not just keywords.
      </p>
      
      {/* Main Search Input */}
      <div className="w-full max-w-3xl relative group">
        <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 text-primary w-6 h-6 z-10" />
        <Input
          className="w-full pl-16 pr-6 py-5 h-auto bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-full shadow-sm text-base text-[var(--on-surface)] placeholder:text-[var(--outline)] focus:border-primary focus:ring-2 focus:ring-accent transition-all duration-200"
          placeholder="e.g. 'A minimalist desk lamp that matches a walnut wood table'"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button 
          onClick={handleSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-xs font-medium hover:bg-[var(--on-primary-fixed)] transition-colors shadow-md"
        >
          Search
        </Button>
      </div>
      
      {/* Suggested Queries */}
      <div className="flex gap-3 mt-6 flex-wrap justify-center">
        <span className="bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] text-xs font-medium px-3 py-1 rounded-lg border border-[var(--outline-variant)]/50">
          Suggested:
        </span>
        {suggestedQueries.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => {
              setQuery(suggestion)
              if (onSearch) onSearch(suggestion)
            }}
            className="bg-[var(--surface-container-lowest)] text-[var(--on-surface)] text-xs font-medium px-3 py-1 rounded-lg border border-[var(--outline-variant)] hover:bg-[var(--surface-container)] transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  )
}

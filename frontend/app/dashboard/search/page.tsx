"use client"

import { useState, useEffect } from "react"
import { Search, Package, Tag, Box, Store, AlertCircle, ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"

// Hooks y Helpers
import { useCompany } from "@/lib/company-context"
import { testSemanticSearch, SearchResult } from "@/lib/api"

export default function SemanticSearchPage() {
  const { activeCompany, isLoadingCompanies } = useCompany()
  
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [apiKey, setApiKey] = useState<string>("") // Necesitamos la llave para MS3

  // Efecto temporal: En un entorno real, debes traer la `system_api_key` del usuario
  // desde el Microservicio 2. Por ahora simularemos que la obtenemos.
  useEffect(() => {
    // Aquí idealmente haces un fetch a un endpoint como GET /api/v1/user/me/api-key
    // Para no bloquearte, usaremos un mock o asume que la sacas de tu auth context
    setApiKey("your_master_api_key_here") 
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || !activeCompany || !apiKey) return;

    setIsSearching(true)
    setHasSearched(true)
    
    try {
      // Llamada al Microservicio 3 usando el company_id activo
      const data = await testSemanticSearch(query, activeCompany.company_id, apiKey)
      setResults(data)
    } catch (error) {
      console.error("Error searching:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Pantalla de carga inicial o sin compañía
  if (isLoadingCompanies) {
    return <div className="flex justify-center items-center min-h-[50vh]"><Spinner className="w-8 h-8 text-primary" /></div>
  }

  if (!activeCompany) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] space-y-4">
        <Store className="w-16 h-16 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold">No Companies Found</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please select a company from the top navigation to test semantic search.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Semantic Search Tester</h1>
        <p className="text-muted-foreground mt-1">
          Test how the AI retrieves products from <strong className="text-foreground">{activeCompany.name}</strong>'s catalog.
        </p>
      </div>

      {/* Search Bar Card */}
      <Card className="border-border shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej: 'A cheap laptop for gaming' or 'Red sports shoes'"
                className="pl-10 h-12 text-md"
              />
            </div>
            <Button type="submit" disabled={isSearching || !query.trim()} className="h-12 px-8">
              {isSearching ? <Spinner className="w-5 h-5 mr-2" /> : "Test Search"}
            </Button>
          </form>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>This connects directly to the Vector Database (Pinecone/PGVector) mimicking what the AI sees before replying.</span>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            Top Results <Badge variant="secondary">{results.length}</Badge>
          </h3>
          
          {results.length === 0 && !isSearching ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Box className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No related products found</h3>
                <p className="text-muted-foreground max-w-sm mt-1">
                  Try a different query or ensure {activeCompany.name} has products synced with embeddings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((product, index) => (
                <Card key={`${product.variant_id}-${index}`} className="overflow-hidden hover:shadow-md transition-shadow">
                  {/* Imagen del Producto (Si existe) */}
                  <div className="w-full h-48 bg-muted/30 border-b border-border flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback si la imagen de Odoo está rota
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground opacity-50">
                        <ImageIcon className="w-10 h-10 mb-2" />
                        <span className="text-xs font-medium">No Image</span>
                      </div>
                    )}
                    {/* Fallback oculto por defecto */}
                    <div className="hidden flex-col items-center text-muted-foreground opacity-50">
                      <ImageIcon className="w-10 h-10 mb-2" />
                      <span className="text-xs font-medium">Image Error</span>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm line-clamp-2" title={product.name}>
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">
                            {product.category || 'General'}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {product.sku && `SKU: ${product.sku}`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 text-green-600 font-semibold">
                          <Tag className="w-4 h-4" />
                          <span>${product.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                          <Package className="w-4 h-4" />
                          <span>Stock: {product.stock}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
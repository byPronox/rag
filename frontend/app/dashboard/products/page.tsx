"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/lib/company-context"
import { getCompanyProducts, ProductItem } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { PackageSearch, ExternalLink, Image as ImageIcon, Search, Tag, DollarSign, Box } from "lucide-react"

export default function ProductsPage() {
  const { activeCompany, isLoadingCompanies } = useCompany()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchProducts() {
      if (activeCompany) {
        setIsLoading(true)
        try {
          const data = await getCompanyProducts(activeCompany.company_id)
          setProducts(data)
        } catch (error) {
          console.error("Error fetching products:", error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setProducts([])
      }
    }

    fetchProducts()
  }, [activeCompany])

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoadingCompanies || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <PackageSearch className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">No Company Selected</h2>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Please select a company from the sidebar to view its exported products.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <PackageSearch className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Exported Products</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Viewing the synchronized catalog for <span className="font-semibold text-foreground">{activeCompany.name}</span>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 px-4 py-2 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Items</p>
            <p className="text-xl font-bold text-foreground">{products.length}</p>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Categories</p>
            <p className="text-xl font-bold text-foreground">
              {new Set(products.map((p) => p.category).filter(Boolean)).size}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search products by name, SKU, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 bg-card border-border shadow-sm text-base rounded-xl transition-all hover:border-primary/50 focus:border-primary"
        />
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-dashed border-border rounded-xl">
          <Box className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No products found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This company doesn't have any products synchronized yet.
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No matching products</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.variant_id} className="group overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-primary/30 bg-card">
              {/* Product Image Area */}
              <div className="aspect-square bg-muted/30 relative flex items-center justify-center border-b border-border overflow-hidden">
                {product.image_512_url || product.image_128_url ? (
                  <img 
                    src={(product.image_512_url || product.image_128_url)!.startsWith('http') ? (product.image_512_url || product.image_128_url) : `data:image/jpeg;base64,${product.image_512_url || product.image_128_url}`} 
                    alt={product.name} 
                    className="object-contain w-full h-full p-4 group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback si la imagen falla
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('fallback-icon');
                    }}
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                )}
                {/* Fallback Icon placeholder */}
                <div className="hidden absolute inset-0 items-center justify-center [.fallback-icon_&]:flex">
                   <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                </div>
                
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-mono text-xs">
                    {product.sku}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  {product.category && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Tag className="w-3.5 h-3.5" />
                      <span className="truncate">{product.category}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Price</p>
                    <div className="flex items-center text-sm font-medium text-foreground">
                      <DollarSign className="w-3.5 h-3.5 text-green-500 mr-0.5" />
                      {product.price_excluded ? Number(product.price_excluded).toFixed(2) : "0.00"}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Stock</p>
                    <div className="flex items-center text-sm font-medium">
                      <Box className={`w-3.5 h-3.5 mr-1.5 ${product.stock > 0 ? "text-blue-500" : "text-destructive"}`} />
                      <span className={product.stock > 0 ? "text-foreground" : "text-destructive"}>
                        {product.stock || 0} units
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {product.website_url && (
                <CardFooter className="p-4 pt-0">
                  <a 
                    href={product.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View in Store
                  </a>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

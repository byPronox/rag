"use client"

import { SearchResult } from "@/lib/api"
import { Package, Tag, Box, ImageIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// 1. Extraemos la tarjeta a su propio componente para evitar confusiones del compilador
function ProductCardItem({ product, isFeatured }: { product: SearchResult, isFeatured: boolean }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col group border-[var(--outline-variant)]">
      <div className={`${isFeatured ? 'h-64' : 'h-48'} w-full bg-muted/30 border-b border-border relative overflow-hidden flex items-center justify-center`}>
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-white"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <ImageIcon className="w-12 h-12 text-muted-foreground opacity-20" />
        )}
        {isFeatured && (
          <Badge className="absolute top-4 left-4 bg-primary text-white shadow-md">
            ✨ Top Match
          </Badge>
        )}
      </div>
      <CardContent className="p-5 flex flex-col flex-1">
        <h4 className={`font-semibold text-[var(--on-surface)] ${isFeatured ? 'text-xl mb-2' : 'text-base line-clamp-2 mb-1'}`} title={product.name}>
          {product.name}
        </h4>
        <div className="mb-4">
          <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground bg-[var(--surface-container-lowest)]">
            {product.category || 'General'}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono ml-2">
            SKU: {product.sku || 'N/A'}
          </span>
        </div>
        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-green-600 font-bold text-lg">
            ${product.price.toFixed(2)}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
            <Package className="w-4 h-4" /> {product.stock} en stock
          </span>
        </div>
      </CardContent>
    </Card>
  );
}


// 2. Componente Principal
interface ProductGridProps {
  products: SearchResult[]
  isSearching: boolean
  hasSearched: boolean
}

export function ProductGrid({ products, isSearching, hasSearched }: ProductGridProps) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Buscando en la base vectorial...</p>
      </div>
    );
  }

  if (hasSearched && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-muted/20">
        <Box className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-medium text-foreground">Sin coincidencias semánticas</h3>
        <p className="text-muted-foreground mt-2 max-w-md">La IA no encontró productos relacionados con tu búsqueda en el catálogo de esta sucursal.</p>
      </div>
    );
  }

  if (!hasSearched) {
    return null;
  }

  const featuredProduct = products[0];
  const secondaryProducts = products.slice(1);

  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4">
      {featuredProduct && (
        <div className="col-span-1 md:col-span-8">
          <ProductCardItem product={featuredProduct} isFeatured={true} />
        </div>
      )}
      {secondaryProducts.map((product) => (
        <div key={product.variant_id} className="col-span-1 md:col-span-4">
          <ProductCardItem product={product} isFeatured={false} />
        </div>
      ))}
    </section>
  );
}
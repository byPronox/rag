"use client"

import { SearchResult } from "@/lib/api"
import { ProductCard, type Product } from "./product-card"
// ADDED "Package" TO THE IMPORT LIST BELOW
import { Box, LockKeyhole, ArrowRight, ImageIcon, Package } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const demoProducts: Product[] = [
  {
    id: "1",
    name: "Odin Minimalist Desk",
    price: 899,
    description: "Crafted from solid walnut with integrated invisible cable routing. The semantic search matched your query for \"walnut wood\" and \"minimalist design\" with a 98% confidence score.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBj7P4jA-hZqXmD-gLJEwgew0MTO0M-k7jw7L_-LTZermhEaupL2bO7RoCxLp4fmrfZqPeCZD9_IVp3MmxTM4jQz7VNHAaymjWVHdId-cke0wBa6McXU4FOqnzcUJCh2-OFDLpC4uQTjzetO0Odft8oZUtgAhxc3rnDlNezefL1INq3zZnDYcHJQyfDmoV6gGkK7sSH45yh5lMbzSj1R6KRMYt33cDuxQOv9iyDIhAWU7vTzjFw49O4L_4IXXmndTbE4HxG3yn-gqY",
    tags: ["Solid Walnut", "Cable Routing", "Matte Finish"],
    isTopMatch: true,
    matchScore: 98
  },
  {
    id: "2",
    name: "Lumina Task Lamp",
    price: 125,
    description: "Matte black finish with adjustable color temperature. Perfect pairing for dark wood surfaces.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCzcoyakF1AUiOc6q43VUQwRpSzDwuZumrH0bZMlqyamnULYQe0vd3IJjySYaSnmSF4MEFfbMzf9M85Lq9ViF-mLetazSkNTn9sxQPzrxmmryIXqyU-xRaswUJwXBR55hNgjTD2R4la_DoihofCPHJAD3OTFNTYIVyZKefE6gUn0n08UlPI3dGqCwHOw1gCjrcxv4NDnWmgyIWAWHQZN66L_d9uzf1rSW6Rm3zmMTXGlD1cThcBmoSuMRCAboppyDL1WJcGo-yYRfY"
  },
  {
    id: "3",
    name: "Keychron V1 Custom",
    price: 95,
    description: "Tactile switches with a retro-minimalist colorway. Designed for deep work and typing comfort.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCLgb7rEqxdleKGe-DWkKIGd0t7bPGlI6DXA0SZ_1fa004oVoCOV1MAB5_u9p84a8LpMF7XdI5TrAPSwK2Cyg6dmnjuEm2mq3MRVYlYSIUSMMi2SaUmSPNqtlj1bh_R3860O_uVke7754FYwF0c1cYMA2Pdl5mS0AZDln2NM5fRhhuR2f-ze1-NgLixKFXSjWzearLitX1xZ-SwsI4xeonsE_tOt5JTTlJEwbWeoZ8WiN5GfsFapcb9suG5pKbvM_bGlsJ2f0DvUac"
  },
  {
    id: "4",
    name: "Artisan Ceramic Mug",
    price: 32,
    description: "Hand-thrown clay with a matte glaze. Elevated essential for your daily workflow routine.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbzxfJTv0R7vDiTXM50A95m6ne5Jg7qFv2YF3YVwX5JRh-_LPBZjJqhNrfp6UyEjezQehaAOZx8hMgG1F-AAxCGADRF-AaavBl6ZaUXu_vpylH-CM3jiwwRYcHa0t_MqpfCZMAi4HRlBhvwysEmTQVqsZDEfwf1NrrxUGFXozwmqBIJ3uq16VJAHvfI5Gz6sJKTEJWlhnUEykIppQePwy5CyEcTqvk3Hias-Mt2tdkw_-gU2nvKsKj2eUUPpbCVx3NHGW2UUb-sVA"
  },
  {
    id: "5",
    name: "Executive Desk Pad",
    price: 85,
    description: "Full-grain Italian leather. Protects surfaces and provides a smooth writing area.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA2-0A8PtMy-juPXj4h3FFMw7oTn2NW57BkL0182KK9jsyehkcxdnVmpC0q9SPexFttqPq0SxbIuzZvT3sTNUBYT7oUNPwrDsGlZg6AhV9sAL0uB14yQBiPwNOIxnfODBnueXnEhyRG-3oN5ujnhNQiSilIFadTwhCzDjU_tcfrfHplT2eboRcryzAW67Ug-aDuNU8VHN_eHYSTfY8CgpdDnZCBn4F8nv6iJ6fDSlamopYLjp3qMQQdrNXGtmV5F38gtqTDTQnov80"
  }
]

function SkeletonCard({ isFeatured }: { isFeatured?: boolean }) {
  return (
    <Card className="overflow-hidden h-full flex flex-col border-[var(--outline-variant)]">
      <div className={`${isFeatured ? 'h-64' : 'h-48'} w-full bg-muted/50 animate-pulse relative`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
      </div>
      <CardContent className="p-5 flex flex-col flex-1 gap-3">
        <div className="h-5 w-3/4 bg-muted/50 animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-muted/50 animate-pulse rounded mb-2" />
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-muted/50 animate-pulse rounded" />
          <div className="h-4 w-20 bg-muted/50 animate-pulse rounded" />
        </div>
        <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
          <div className="h-6 w-16 bg-muted/50 animate-pulse rounded" />
          <div className="h-4 w-20 bg-muted/50 animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

function ProductCardItem({ product, isFeatured }: { product: SearchResult, isFeatured: boolean }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col group border-[var(--outline-variant)]">
      <div className={`${isFeatured ? 'h-64' : 'h-48'} w-full bg-muted/30 border-b border-border relative overflow-hidden flex items-center justify-center`}>
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-white"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
          <span className="text-xs text-muted-foreground font-mono ml-2">SKU: {product.sku || 'N/A'}</span>
        </div>
        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-green-600 font-bold text-lg">${product.price.toFixed(2)}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
            <Package className="w-4 h-4" /> {product.stock} in stock
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProductGridProps {
  products?: SearchResult[]
  isSearching?: boolean
  hasSearched?: boolean
  showAuthCTA?: boolean
}

export function ProductGrid({ products = [], isSearching = false, hasSearched = false, showAuthCTA = false }: ProductGridProps) {
  
  if (isSearching) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-1 md:col-span-8"><SkeletonCard isFeatured={true} /></div>
        <div className="col-span-1 md:col-span-4"><SkeletonCard /></div>
        <div className="col-span-1 md:col-span-4"><SkeletonCard /></div>
        <div className="col-span-1 md:col-span-4"><SkeletonCard /></div>
        <div className="col-span-1 md:col-span-4"><SkeletonCard /></div>
      </section>
    )
  }

  if (showAuthCTA) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-border rounded-3xl bg-[var(--surface-container-lowest)] shadow-sm animate-in zoom-in-95 duration-500 max-w-3xl mx-auto w-full">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <LockKeyhole className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3">Experience Full Power</h3>
        <p className="text-muted-foreground mb-8 max-w-lg leading-relaxed">
          To complete the experience and connect our AI engine with a real product catalog, you need an authorized account.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/login">
            <Button size="lg" className="rounded-full px-8 h-12 text-md shadow-md hover:scale-105 transition-transform">
              Login to RAG Admin <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-md">
            Contact us for access
          </Button>
        </div>
      </div>
    )
  }

  if (hasSearched && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-muted/20">
        <Box className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-medium text-foreground">No semantic matches found</h3>
        <p className="text-muted-foreground mt-2 max-w-md">The AI couldn't find products matching your query in the current catalog.</p>
      </div>
    )
  }

  let displayProducts: Product[] | SearchResult[] = [];
  let isDemo = false;

  if (hasSearched && products.length > 0) {
    displayProducts = products;
  } else {
    displayProducts = demoProducts as any; 
    isDemo = true;
  }

  const featuredProduct = displayProducts[0];
  const secondaryProducts = displayProducts.slice(1);

  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4">
      {featuredProduct && (
        <div className="col-span-1 md:col-span-8">
          {isDemo ? (
             <ProductCard product={featuredProduct as Product} variant="featured" />
          ) : (
             <ProductCardItem product={featuredProduct as SearchResult} isFeatured={true} />
          )}
        </div>
      )}
      
      {secondaryProducts.map((product: any) => (
        <div key={product.id || product.variant_id} className="col-span-1 md:col-span-4">
          {isDemo ? (
            <ProductCard product={product as Product} />
          ) : (
            <ProductCardItem product={product as SearchResult} isFeatured={false} />
          )}
        </div>
      ))}
    </section>
  )
}
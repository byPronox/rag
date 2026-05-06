"use client"

import { SearchResult } from "@/lib/api"
import { mapSearchResultToProduct } from "@/lib/mappers" // <-- Usamos el Mapper
import { ProductCard, type Product } from "./product-card"
import { Box, LockKeyhole, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// Mantenemos la data de prueba
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

// Reemplaza tu antigua función SkeletonCard con esta versión Premium
function SkeletonCard({ isFeatured }: { isFeatured?: boolean }) {
  return (
    <Card className="overflow-hidden h-full flex flex-col border-border/40 bg-background shadow-sm">
      <div className={`${isFeatured ? 'h-64 md:h-72' : 'h-48'} w-full relative overflow-hidden bg-muted/80`}>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
      </div>
      
      <CardContent className="p-5 flex flex-col flex-1 gap-4">
        <div className="space-y-3">
          <div className="h-5 w-3/4 bg-muted/80 rounded-md overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
          </div>
          <div className="h-4 w-1/2 bg-muted/80 rounded-md overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-border/30 flex justify-between items-center">
          <div className="h-6 w-20 bg-muted/80 rounded-md overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
          </div>
          <div className="h-8 w-24 bg-muted/80 rounded-md overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
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

  // LÓGICA UNIFICADA: Usamos los productos de demo, o mapeamos los del backend
  const isDemo = !hasSearched || products.length === 0;
  const displayProducts: Product[] = isDemo 
    ? demoProducts 
    : products.map(mapSearchResultToProduct);

  const featuredProduct = displayProducts[0];
  const secondaryProducts = displayProducts.slice(1);

  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4">
      {featuredProduct && (
        <div className="col-span-1 md:col-span-8">
          <ProductCard product={featuredProduct} variant="featured" />
        </div>
      )}
      
      {secondaryProducts.map((product) => (
        <div key={product.id} className="col-span-1 md:col-span-4 h-full">
          <ProductCard product={product} />
        </div>
      ))}
    </section>
  )
}
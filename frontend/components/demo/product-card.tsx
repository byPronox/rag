"use client"

import { useState } from "react"
import { Star, ShoppingCart, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export interface Product {
  id: string
  name: string
  price: number
  description: string
  image: string
  tags?: string[]
  isTopMatch?: boolean
  matchScore?: number
}

interface ProductCardProps {
  product: Product
  variant?: "featured" | "default"
}

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const isFeatured = variant === "featured"
  // Estado para controlar la aparición suave de la imagen
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [hasImageError, setHasImageError] = useState(false)
  
  return (
    <article 
      className={`
        bg-[var(--surface-container-lowest)] border border-[var(--surface-variant)] rounded-xl overflow-hidden flex 
        ${isFeatured ? "flex-col md:flex-row" : "flex-col"} 
        group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full
      `}
    >
      {/* Image Container */}
      <div 
        className={`
          ${isFeatured ? "w-full md:w-1/2 h-64 md:h-auto min-h-[16rem]" : "w-full h-48"} 
          relative overflow-hidden bg-muted/10 flex items-center justify-center
        `}
      >
        {!hasImageError ? (
          <>
            {/* Animación de carga mientras la imagen se descarga */}
            {!isImageLoaded && (
               <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-muted/20 to-transparent z-10" />
            )}
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setHasImageError(true)}
              className={`
                object-cover transition-all duration-700
                ${isImageLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0 scale-95'}
              `}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground opacity-30">
             <ImageIcon className="w-12 h-12 mb-2" />
             <span className="text-xs">No image</span>
          </div>
        )}
        
        {product.isTopMatch && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 z-20">
            <Star className="w-3.5 h-3.5 fill-current" />
            AI Top Match
          </div>
        )}
      </div>
      
      {/* Content */}
      <div 
        className={`
          ${isFeatured ? "w-full md:w-1/2 p-6" : "p-5"} 
          flex flex-col flex-grow
        `}
      >
        <div className="flex-grow">
          <div className="flex items-start justify-between mb-3 gap-4">
            <h3 
              className={`
                ${isFeatured ? "text-2xl" : "text-lg line-clamp-2"} 
                font-bold text-[var(--on-surface)] leading-tight
              `}
              title={product.name}
            >
              {product.name}
            </h3>
            <span 
              className={`
                ${isFeatured ? "text-xl" : "text-lg"} 
                font-black text-primary whitespace-nowrap
              `}
            >
              ${product.price.toFixed(2)}
            </span>
          </div>
          
          <p 
            className={`
              text-sm text-[var(--on-surface-variant)] mb-5 
              ${isFeatured ? "leading-relaxed" : "line-clamp-2"}
            `}
          >
            {product.description}
          </p>
          
          {/* Tags - only for featured */}
          {isFeatured && product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.tags.map((tag) => (
                <span 
                  key={tag}
                  className="bg-[var(--surface-container-low)] text-[var(--on-surface)] text-xs font-semibold px-2.5 py-1 rounded-md border border-[var(--outline-variant)]/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Action Button fijado siempre abajo gracias al flex-grow del div anterior */}
        <div className="mt-auto pt-4">
          <Button 
            variant={isFeatured ? "default" : "outline"}
            className="w-full text-xs font-bold py-5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isFeatured ? (
              <>
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </>
            ) : (
              "View Details"
            )}
          </Button>
        </div>
      </div>
    </article>
  )
}
"use client"

import { Star, ShoppingCart } from "lucide-react"
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
  
  return (
    <article 
      className={`
        bg-[var(--surface-container-lowest)] border border-[var(--surface-variant)] rounded-xl overflow-hidden flex 
        ${isFeatured ? "flex-col md:flex-row" : "flex-col"} 
        group transition-shadow duration-300 hover:shadow-lg
      `}
    >
      {/* Image Container */}
      <div 
        className={`
          ${isFeatured ? "w-full md:w-1/2 h-64 md:h-auto" : "w-full h-48"} 
          relative overflow-hidden bg-[var(--surface-container)]
        `}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          unoptimized
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        
        {product.isTopMatch && (
          <div className="absolute top-3 left-3 bg-[var(--primary-container)] text-[var(--on-primary-container)] text-xs font-medium px-3 py-1 rounded-lg shadow-sm flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-current" />
            AI Top Match
          </div>
        )}
      </div>
      
      {/* Content */}
      <div 
        className={`
          ${isFeatured ? "w-full md:w-1/2 p-6" : "p-4"} 
          flex flex-col flex-grow justify-between
        `}
      >
        <div>
          <div className="flex items-start justify-between mb-2">
            <h3 
              className={`
                ${isFeatured ? "text-2xl" : "text-lg"} 
                font-semibold text-[var(--on-surface)] leading-tight
              `}
            >
              {product.name}
            </h3>
            <span 
              className={`
                ${isFeatured ? "text-lg" : "text-base"} 
                font-semibold text-primary
              `}
            >
              ${product.price}
            </span>
          </div>
          
          <p 
            className={`
              text-sm text-[var(--on-surface-variant)] mb-4 
              ${isFeatured ? "" : "line-clamp-2"}
            `}
          >
            {product.description}
          </p>
          
          {/* Tags - only for featured */}
          {isFeatured && product.tags && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.tags.map((tag) => (
                <span 
                  key={tag}
                  className="bg-[var(--surface-container-low)] text-[var(--on-surface)] text-xs font-medium px-2 py-1 rounded-lg border border-[var(--outline-variant)]/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Action Button */}
        <Button 
          variant={isFeatured ? "outline" : "outline"}
          className="w-full bg-[var(--surface-container-lowest)] text-[var(--on-surface)] border border-[var(--outline-variant)] text-xs font-medium py-2.5 rounded-lg hover:bg-[var(--surface-container)] transition-colors flex items-center justify-center gap-2"
        >
          {isFeatured ? (
            <>
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </>
          ) : (
            "View Details"
          )}
        </Button>
      </div>
    </article>
  )
}

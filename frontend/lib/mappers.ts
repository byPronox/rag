import { SearchResult } from "@/lib/api"
import { Product } from "@/components/demo/product-card"

export function mapSearchResultToProduct(result: SearchResult): Product {
  return {
    id: result.variant_id.toString(),
    name: result.name,
    price: result.price,
    description: `Categoría: ${result.category || 'General'} | Stock disponible: ${result.stock} | SKU: ${result.sku}`,
    image: result.image_url || "", // Idealmente pon aquí una URL a una imagen "placeholder" por defecto
    tags: result.category ? [result.category] : [],
  }
}
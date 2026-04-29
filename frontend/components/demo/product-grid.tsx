"use client"

import { ProductCard, type Product } from "./product-card"

// Demo products - these would come from your API
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

interface ProductGridProps {
  products?: Product[]
}

export function ProductGrid({ products = demoProducts }: ProductGridProps) {
  const [featuredProduct, ...secondaryProducts] = products
  
  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Featured Item (Spans 8 cols) */}
      {featuredProduct && (
        <div className="col-span-1 md:col-span-8">
          <ProductCard product={featuredProduct} variant="featured" />
        </div>
      )}
      
      {/* Secondary Items (Span 4 cols each) */}
      {secondaryProducts.map((product) => (
        <div key={product.id} className="col-span-1 md:col-span-4">
          <ProductCard product={product} />
        </div>
      ))}
    </section>
  )
}

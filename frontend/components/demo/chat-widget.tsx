"use client"

import { useState, useEffect, useRef } from "react"
import {
  Bot, MessageSquare, Sparkles, Store, User as UserIcon, Send, X, Lock,
  ArrowLeft, ChevronRight, ExternalLink, ShoppingBag, CheckCircle2, XCircle,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { getCompanyConfig, sendRagMessage, RagProduct } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const ICONS = { Bot, MessageSquare, Sparkles, Store }

interface Message {
  id: string
  text: string
  isUser: boolean
  products?: RagProduct[] // tarjetas que van después de `text`
  after?: string          // texto que sigue a las tarjetas
}

// Textos nuevos según el idioma del navegador (el resto del widget conserva sus textos)
const LABELS = {
  es: { viewProduct: "Ver producto", back: "Volver", inStock: "Disponible", outOfStock: "Agotado",
        connectionError: "No pude conectarme con el asistente. Intenta de nuevo en un momento." },
  en: { viewProduct: "View product", back: "Back", inStock: "In stock", outOfStock: "Out of stock",
        connectionError: "I couldn't reach the assistant. Please try again in a moment." },
}

function getLabels() {
  if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("es")) return LABELS.es
  return LABELS.en
}

function formatPrice(price: number, currency?: string | null) {
  try {
    if (currency) {
      return new Intl.NumberFormat(undefined, {
        style: "currency", currency, maximumFractionDigits: currency === "COP" ? 0 : 2,
      }).format(price)
    }
  } catch {
    // moneda desconocida: se muestra el número tal cual
  }
  return `${price.toFixed(2)} ${currency || ""}`.trim()
}

// La conversación sobrevive a la navegación dentro de la misma pestaña
const storageKey = (companyId: string, kind: "session" | "messages") => `rag_demo_${kind}_${companyId}`

function readStorage<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value))
  } catch {
    // almacenamiento lleno o bloqueado: el chat sigue funcionando sin persistencia
  }
}

function ProductThumb({ product, size }: { product: RagProduct; size: "sm" | "lg" }) {
  const [failed, setFailed] = useState(false)
  const src = size === "sm" ? product.image_128_url || product.image_url : product.image_url || product.image_128_url
  if (!src || failed) {
    return <ShoppingBag className={size === "sm" ? "w-5 h-5 text-muted-foreground/50" : "w-12 h-12 text-muted-foreground/40"} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={product.name} onError={() => setFailed(true)}
              className={size === "sm" ? "w-full h-full object-cover" : "w-full h-full object-contain"} />
}

function ProductList({ products, color, onSelect, labels }: {
  products: RagProduct[]; color: string; onSelect: (p: RagProduct) => void; labels: typeof LABELS.es
}) {
  return (
    <div className="my-2 flex flex-col gap-1.5">
      {products.map(product => (
        <button
          key={product.variant_id}
          onClick={() => onSelect(product)}
          className="group flex items-center gap-2.5 w-full text-left p-1.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
            <ProductThumb product={product} size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-foreground">{product.name}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold" style={{ color }}>{formatPrice(product.price, product.currency)}</span>
              {!product.in_stock && (
                <span className="text-[10px] px-1.5 rounded bg-muted text-muted-foreground">{labels.outOfStock}</span>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
        </button>
      ))}
    </div>
  )
}

function ProductDetail({ product, color, onClose, labels }: {
  product: RagProduct; color: string; onClose: () => void; labels: typeof LABELS.es
}) {
  return (
    <div className="absolute inset-0 z-20 bg-background flex flex-col animate-in fade-in zoom-in-95 duration-200">
      <div className="p-4 flex justify-between items-center text-white shadow-sm" style={{ backgroundColor: color }}>
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm font-medium hover:bg-white/20 px-2 py-1 -ml-2 rounded-md transition-colors">
          <ArrowLeft className="w-4 h-4" /> {labels.back}
        </button>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-md transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="w-full aspect-square max-h-56 rounded-xl bg-muted/40 border border-border flex items-center justify-center overflow-hidden">
          <ProductThumb product={product} size="lg" />
        </div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base text-foreground leading-snug">{product.name}</h3>
          {product.category && (
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
              {product.category}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold" style={{ color }}>{formatPrice(product.price, product.currency)}</span>
          <span className={`flex items-center gap-1 text-xs font-medium ${product.in_stock ? "text-emerald-600" : "text-muted-foreground"}`}>
            {product.in_stock ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {product.in_stock ? labels.inStock : labels.outOfStock}
          </span>
        </div>
        {product.description && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
        )}
      </div>

      <div className="p-3 border-t border-border bg-background">
        {product.url ? (
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full rounded-full h-10 text-white shadow-md gap-2" style={{ backgroundColor: color }}>
              {labels.viewProduct} <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        ) : (
          <Button disabled className="w-full rounded-full h-10" style={{ backgroundColor: color }}>{labels.viewProduct}</Button>
        )}
      </div>
    </div>
  )
}

export function ChatWidget() {
  // AHORA EXTRAEMOS EL USUARIO COMPLETO (que contiene user.api_key gracias a tu endpoint /me)
  const { isAuthenticated, user } = useAuth()
  const { activeCompany } = useCompany()

  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<RagProduct | null>(null)
  const [sessionId, setSessionId] = useState(`web_demo_${Date.now()}`)
  const [labels, setLabels] = useState(LABELS.en)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [config, setConfig] = useState({
    color: "#8b5cf6",
    welcome: "Hello! How can I help you find the perfect product today?",
    icon: "Bot"
  })

  useEffect(() => setLabels(getLabels()), [])

  useEffect(() => {
    setSelectedProduct(null)
    if (isAuthenticated && activeCompany) {
      const companyId = activeCompany.company_id
      // Misma sesión y mensajes al volver a esta compañía en la pestaña
      const savedSession = readStorage<string>(storageKey(companyId, "session"))
      const session = savedSession || `web_demo_${Date.now()}`
      writeStorage(storageKey(companyId, "session"), JSON.stringify(session))
      setSessionId(session)
      const savedMessages = readStorage<Message[]>(storageKey(companyId, "messages"))
      if (savedMessages?.length) setMessages(savedMessages)

      getCompanyConfig(companyId).then(data => {
        if (data) {
          setConfig(prev => ({
            ...prev,
            color: data.theme_color || prev.color,
            welcome: data.welcome_message || prev.welcome,
            icon: data.chat_icon || prev.icon
          }))
          if (!savedMessages?.length) {
            setMessages([{ id: 'welcome', text: data.welcome_message || config.welcome, isUser: false }])
          }
        }
      }).catch(console.error)
    } else {
      setMessages([{
        id: 'welcome',
        text: "Hello! To access full AI chat features and search real catalogs, please contact us for access or log in to your account.",
        isUser: false
      }])
      setConfig(prev => ({ ...prev, color: "#8b5cf6", icon: "Bot" }))
    }
  }, [activeCompany, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && activeCompany && messages.length) {
      writeStorage(storageKey(activeCompany.company_id, "messages"), messages)
    }
  }, [messages, activeCompany, isAuthenticated])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const SelectedIcon = ICONS[config.icon as keyof typeof ICONS] || Bot

  const handleSend = async () => {
    if (!input.trim() || !isAuthenticated || !activeCompany || isTyping) return
    const text = input.trim()
    setInput("")

    setMessages(prev => [...prev, { id: Date.now().toString(), text, isUser: true }])
    setIsTyping(true)

    // VALIDACIÓN CRÍTICA: Aseguramos que tenemos la llave antes de llamar al Microservicio 3
    // Como TypeScript a veces no detecta campos nuevos rápido, usamos un cast defensivo.
    const userApiKey = (user as any)?.api_key;

    if (!userApiKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "Error: No se encontró la API Key en tu sesión. Por favor, cierra sesión y vuelve a entrar.",
        isUser: false
      }])
      setIsTyping(false)
      return;
    }

    try {
      // Llamada real usando la llave del usuario actual (Admin o Tenant)
      const data = await sendRagMessage(
        {
          message: text,
          session_id: sessionId,
          company_id: activeCompany.company_id
        },
        userApiKey // <--- LA MAGIA OCURRE AQUÍ
      )

      const products = data.products_referenced || []
      // Con tarjetas se usa el texto separado; sin tarjetas, el texto completo de siempre
      const before = products.length ? (data.reply_before ?? data.reply) : (data.reply || data.answer)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: before || "Sorry, error.",
        isUser: false,
        products,
        after: products.length ? data.reply_after : undefined,
      }])
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: labels.connectionError, isUser: false }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="relative w-[350px] h-[550px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5">
          <div className="p-4 flex justify-between items-center text-white shadow-sm" style={{ backgroundColor: config.color }}>
            <div className="flex items-center gap-2">
              <SelectedIcon className="w-5 h-5" />
              <span className="font-semibold text-sm">
                {isAuthenticated && activeCompany ? `${activeCompany.name} AI` : "Demo Assistant"}
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-md transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.map(msg => {
              const hasProducts = !msg.isUser && !!msg.products?.length
              return (
                <div key={msg.id} className={`flex gap-3 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: config.color }}>
                    {msg.isUser ? <UserIcon className="w-4 h-4" /> : <SelectedIcon className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-2 text-sm shadow-sm whitespace-pre-line ${hasProducts ? 'flex-1 min-w-0' : 'max-w-[75%]'} ${msg.isUser ? 'text-white rounded-2xl rounded-tr-sm' : 'bg-background border border-border text-foreground rounded-2xl rounded-tl-sm'}`} style={msg.isUser ? { backgroundColor: config.color } : {}}>
                    {msg.text}
                    {hasProducts && (
                      <ProductList products={msg.products!} color={config.color} onSelect={setSelectedProduct} labels={labels} />
                    )}
                    {hasProducts && msg.after}
                  </div>
                </div>
              )
            })}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: config.color }}><SelectedIcon className="w-4 h-4" /></div>
                <div className="bg-background border border-border px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border bg-background">
            {isAuthenticated ? (
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything..."
                  className="flex-1 rounded-full text-sm h-10"
                  disabled={!activeCompany}
                />
                <Button onClick={handleSend} disabled={!input.trim() || !activeCompany || isTyping} size="icon" className="h-10 w-10 rounded-full text-white shadow-md hover:scale-105 transition-transform" style={{ backgroundColor: config.color }}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex w-full">
                <Link href="/login" className="w-full">
                  <Button className="w-full rounded-full h-10 shadow-sm" style={{ backgroundColor: config.color }}>
                    <Lock className="w-4 h-4 mr-2" /> Log In to Chat
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {selectedProduct && (
            <ProductDetail product={selectedProduct} color={config.color} labels={labels} onClose={() => setSelectedProduct(null)} />
          )}
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
          style={{ backgroundColor: config.color }}
        >
          <SelectedIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}

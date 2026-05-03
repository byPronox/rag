"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, X, Send, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// 1. Añadimos propiedades para que el widget pueda recibir la API Key si la tiene directamente
interface ChatWidgetProps {
  apiKey?: string;
}

// 2. Recibimos las propiedades en el componente principal
export function ChatWidget({ apiKey }: ChatWidgetProps = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI shopping assistant. How can I help you find the perfect product today?",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    
    try {
      const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8001";
      
      // 3. MAGIA CORREGIDA: Buscamos la llave en los props o en la variable global del script embebido
      const finalApiKey = apiKey || (typeof window !== "undefined" ? (window as any).RAG_CONFIG?.apiKey : "") || "";

      if (!finalApiKey) {
        console.error("No API key configured for the ChatWidget");
      }

      const response = await fetch(`${RAG_API_URL}/api/v1/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": finalApiKey // <--- Ya no lanza error de Typescript
        },
        body: JSON.stringify({
          message: userMessage.content,
          session_id: "session_" + Date.now() 
        })
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || data.answer || "No response received", 
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error("Error calling RAG API:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting to the server right now.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Obtenemos el color del tema desde la variable global si existe, sino usamos el por defecto
  const themeColor = typeof window !== "undefined" ? (window as any).RAG_CONFIG?.color : "#8b5cf6";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl shadow-lg flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--outline-variant)] flex justify-between items-center" style={{ backgroundColor: themeColor }}>
            <div className="flex items-center gap-2 text-white">
              <Bot className="w-5 h-5" />
              <span className="text-xs font-medium">AI Shopping Assistant</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 transition-colors h-8 w-8 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-80 min-h-[280px] bg-background">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${message.role === "user" 
                      ? "text-white" 
                      : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
                    }
                  `}
                  style={{ backgroundColor: message.role === "user" ? themeColor : undefined }}
                >
                  {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div 
                  className={`
                    max-w-[75%] px-3 py-2 rounded-xl text-sm
                    ${message.role === "user" 
                      ? "text-white rounded-tr-none" 
                      : "bg-[var(--surface-container)] text-[var(--on-surface)] rounded-tl-none"
                    }
                  `}
                  style={{ backgroundColor: message.role === "user" ? themeColor : undefined }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-container)] text-[var(--on-surface-variant)]">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[var(--surface-container)] px-3 py-2 rounded-xl rounded-tl-none">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[var(--on-surface-variant)]/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-[var(--on-surface-variant)]/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-[var(--on-surface-variant)]/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="p-3 border-t border-[var(--outline-variant)] bg-[var(--surface)]">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about products..."
                className="flex-1 bg-[var(--surface-container-lowest)] border-[var(--outline-variant)] rounded-full px-4 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="rounded-full text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: themeColor }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={`
          w-14 h-14 rounded-full shadow-lg transition-all duration-300 text-white
          ${isOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}
        `}
        style={{ backgroundColor: themeColor, display: isOpen ? 'none' : 'flex' }}
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      {/* Close Button when open */}
      <Button
        onClick={() => setIsOpen(false)}
        size="icon"
        className={`
          w-14 h-14 rounded-full shadow-lg transition-all duration-300
          ${isOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}
          bg-white text-foreground hover:bg-gray-100
        `}
        style={{ display: isOpen ? 'flex' : 'none' }}
      >
        <X className="w-6 h-6" />
      </Button>
    </div>
  )
}
"use client"

import { useState, useEffect, useRef } from "react"
import { Bot, MessageSquare, Sparkles, Store, User, Send, X } from "lucide-react"
import { useCompany } from "@/lib/company-context"
import { getCompanyConfig } from "@/lib/api"

const ICONS = { Bot, MessageSquare, Sparkles, Store }

interface Message {
  id: string
  text: string
  isUser: boolean
}

export function ChatWidget() {
  const { activeCompany } = useCompany()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Configuración dinámica
  const [config, setConfig] = useState({
    color: "#8b5cf6",
    welcome: "Hello! How can I help you find the perfect product today?",
    icon: "Bot",
    apiKey: "your_master_api_key_here"
  })

  // Generar ID de sesión al cargar
  const [sessionId] = useState(`web_demo_${Date.now()}`)

  // Cargar configuración de la compañía activa
  useEffect(() => {
    if (activeCompany) {
      getCompanyConfig(activeCompany.company_id).then(data => {
        if (data) {
          setConfig(prev => ({
            ...prev,
            color: data.theme_color || prev.color,
            welcome: data.welcome_message || prev.welcome,
            icon: data.chat_icon || prev.icon
          }))
          setMessages([{ id: 'welcome', text: data.welcome_message || config.welcome, isUser: false }])
        }
      }).catch(console.error)
    } else {
      setMessages([{ id: 'welcome', text: config.welcome, isUser: false }])
    }
  }, [activeCompany])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const SelectedIcon = ICONS[config.icon as keyof typeof ICONS] || Bot

  const handleSend = async () => {
    if (!input.trim() || !activeCompany) return
    const text = input.trim()
    setInput("")
    
    setMessages(prev => [...prev, { id: Date.now().toString(), text, isUser: true }])
    setIsTyping(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_RAG_API_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey
        },
        body: JSON.stringify({ 
          message: text, 
          session_id: sessionId,
          company_id: activeCompany.company_id 
        })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { id: Date.now().toString(), text: data.reply || data.answer || "Sorry, error.", isUser: false }])
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: "Connection error.", isUser: false }])
    } finally {
      setIsTyping(false)
    }
  }

  if (!activeCompany) return null; // No mostrar chatbot si no hay compañía

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="w-[350px] h-[550px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5">
          <div className="p-4 flex justify-between items-center text-white shadow-sm" style={{ backgroundColor: config.color }}>
            <div className="flex items-center gap-2">
              <SelectedIcon className="w-5 h-5" />
              <span className="font-semibold text-sm">AI Assistant Preview</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-md transition-colors"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: config.color }}>
                  {msg.isUser ? <User className="w-4 h-4" /> : <SelectedIcon className="w-4 h-4" />}
                </div>
                <div className={`px-4 py-2 text-sm max-w-[75%] shadow-sm ${msg.isUser ? 'text-white rounded-2xl rounded-tr-sm' : 'bg-background border border-border text-foreground rounded-2xl rounded-tl-sm'}`} style={msg.isUser ? { backgroundColor: config.color } : {}}>
                  {msg.text}
                </div>
              </div>
            ))}
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
            <div className="flex gap-2">
              <Input 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Test your AI..." 
                className="flex-1 rounded-full text-sm h-10" 
              />
              <Button onClick={handleSend} disabled={!input.trim()} size="icon" className="h-10 w-10 rounded-full text-white shadow-md hover:scale-105 transition-transform" style={{ backgroundColor: config.color }}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
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
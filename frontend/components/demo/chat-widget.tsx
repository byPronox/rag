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

export function ChatWidget() {
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
    
    // Simulate API call - replace with actual RAG API call
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I found some great options based on "${userMessage.content}". Let me show you some products that match your needs. You can also use our semantic search above for more specific results!`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl shadow-lg flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-[var(--surface)] px-4 py-3 border-b border-[var(--outline-variant)] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="text-primary w-5 h-5" />
              <span className="text-xs font-medium text-[var(--on-surface)]">AI Shopping Assistant</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-80 min-h-[280px]">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
                    }
                  `}
                >
                  {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div 
                  className={`
                    max-w-[75%] px-3 py-2 rounded-xl text-sm
                    ${message.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-[var(--surface-container)] text-[var(--on-surface)] rounded-tl-none"
                    }
                  `}
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
          <div className="p-4 border-t border-[var(--outline-variant)] bg-[var(--surface)]">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about products..."
                className="flex-1 bg-[var(--surface-container-lowest)] border-[var(--outline-variant)] rounded-full px-4 text-sm focus-visible:ring-primary"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50"
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
          w-14 h-14 rounded-full shadow-lg transition-all duration-300
          ${isOpen 
            ? "bg-[var(--surface-container)] text-[var(--on-surface)] hover:bg-[var(--surface-container-low)]" 
            : "bg-primary text-primary-foreground hover:bg-primary/90"
          }
        `}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </Button>
    </div>
  )
}

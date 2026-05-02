"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Save, Code, Bot, MessageSquare, Sparkles, Store, User, Send, Check } from "lucide-react"

// Importa tus funciones de API (asegúrate de que getUserConfig y updateUserConfig manejen theme_color y chat_icon)
import { getUserConfig, updateUserConfig, getModels, AIModel, UserConfig } from "@/lib/api"

// Diccionario de íconos disponibles para el usuario
const ICONS = {
  Bot: Bot,
  MessageSquare: MessageSquare,
  Sparkles: Sparkles,
  Store: Store,
}

// Colores predeterminados elegantes
const PRESET_COLORS = [
  { name: "Purple (Default)", value: "#8b5cf6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Orange", value: "#f97316" },
  { name: "Slate", value: "#64748b" },
]

export default function ChatbotConfigPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  
  const [config, setConfig] = useState({
    welcome_message: "Hello! I'm your AI shopping assistant. How can I help you?",
    system_prompt: "You are a helpful sales assistant...",
    selected_llm_model: "",
    theme_color: "#8b5cf6",
    chat_icon: "Bot",
    system_api_key: "dummy_key_for_preview"
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modelsData, userConf] = await Promise.all([
          getModels(),
          getUserConfig()
        ])

        if (modelsData) {
          setAvailableModels(modelsData.filter(m => m.is_active && m.type === "llm"))
        }

        if (userConf) {
          setConfig({
            welcome_message: userConf.welcome_message || config.welcome_message,
            system_prompt: userConf.system_prompt || config.system_prompt,
            selected_llm_model: userConf.selected_llm_model || "",
            theme_color: (userConf as any).theme_color || "#8b5cf6",
            chat_icon: (userConf as any).chat_icon || "Bot",
            system_api_key: userConf.system_api_key || ""
          })
        }
      } catch (error) {
        console.error("Error loading config:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateUserConfig(config as Partial<UserConfig>)
      alert("Chatbot configuration saved successfully!")
    } catch (error) {
      alert("Error saving configuration.")
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Generador del Script de Integración
  const embedCode = `
<!-- Start RAG SaaS Chatbot -->
<script>
  window.RAG_CONFIG = {
    apiKey: "${config.system_api_key}",
    color: "${config.theme_color}",
    icon: "${config.chat_icon}"
  };
</script>
<script src="https://rag-frontend-tan.vercel.app/widget.js" async></script>
<!-- End RAG SaaS Chatbot -->
  `.trim()

  const SelectedIcon = ICONS[config.chat_icon as keyof typeof ICONS] || Bot

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[50vh]"><Spinner className="w-8 h-8 text-primary" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Chatbot Configuration</h1>
          <p className="text-muted-foreground mt-1">Customize your assistant's behavior, appearance, and get your embed code.</p>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Code className="w-4 h-4" /> Embed Chatbot
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Embed on your website</DialogTitle>
                <DialogDescription>
                  Copy and paste this code snippet right before the closing <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> tag on your website or e-commerce platform.
                </DialogDescription>
              </DialogHeader>
              <div className="relative mt-4">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto font-mono text-muted-foreground">
                  {embedCode}
                </pre>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => copyToClipboard(embedCode)}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Code className="h-4 w-4" />}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Settings Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Behavior</CardTitle>
              <CardDescription>Configure how your chatbot thinks and speaks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Language Model (LLM)</Label>
                <Select 
                  value={config.selected_llm_model} 
                  onValueChange={(val) => setConfig({...config, selected_llm_model: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Input 
                  value={config.welcome_message}
                  onChange={(e) => setConfig({...config, welcome_message: e.target.value})}
                  placeholder="Welcome to our store!"
                />
                <p className="text-xs text-muted-foreground">The first message the user sees when opening the chat.</p>
              </div>

              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea 
                  rows={4}
                  value={config.system_prompt}
                  onChange={(e) => setConfig({...config, system_prompt: e.target.value})}
                  placeholder="You are a polite assistant..."
                />
                <p className="text-xs text-muted-foreground">Instructions that dictate the AI's personality and rules.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the widget to match your brand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Picker */}
              <div className="space-y-3">
                <Label>Brand Color</Label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setConfig({...config, theme_color: color.value})}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${config.theme_color === color.value ? 'scale-110 border-foreground shadow-md' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-4 border-l pl-4 border-muted">
                    <Input 
                      type="color" 
                      value={config.theme_color}
                      onChange={(e) => setConfig({...config, theme_color: e.target.value})}
                      className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground font-mono uppercase">{config.theme_color}</span>
                  </div>
                </div>
              </div>

              {/* Icon Picker */}
              <div className="space-y-3">
                <Label>Widget Icon</Label>
                <div className="flex gap-3">
                  {Object.entries(ICONS).map(([name, IconComponent]) => (
                    <button
                      key={name}
                      onClick={() => setConfig({...config, chat_icon: name})}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        config.chat_icon === name 
                          ? 'text-white shadow-md' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      style={{ backgroundColor: config.chat_icon === name ? config.theme_color : undefined }}
                    >
                      <IconComponent className="w-6 h-6" />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Preview */}
        <div className="flex flex-col items-center pt-8">
          <div className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-widest">Live Preview</div>
          
          {/* Mock Browser/Phone Window */}
          <div className="w-full max-w-[400px] h-[600px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col">
            {/* Fake Header */}
            <div className="h-14 bg-muted/30 border-b border-[var(--outline-variant)] flex items-center px-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
            </div>
            
            {/* Fake Content */}
            <div className="flex-1 p-6 flex flex-col gap-4 opacity-30 pointer-events-none">
              <div className="h-8 w-3/4 bg-muted rounded-md" />
              <div className="h-32 w-full bg-muted rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-40 bg-muted rounded-xl" />
                <div className="h-40 bg-muted rounded-xl" />
              </div>
            </div>

            {/* PREVIEW CHAT WIDGET (Always Open) */}
            <div className="absolute bottom-6 right-6 flex flex-col items-end z-10 w-[340px]">
              <div className="w-full bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl shadow-lg flex flex-col overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-[var(--outline-variant)] flex justify-between items-center" style={{ backgroundColor: config.theme_color }}>
                  <div className="flex items-center gap-2 text-white">
                    <SelectedIcon className="w-5 h-5" />
                    <span className="text-xs font-medium">Assistant</span>
                  </div>
                </div>
                
                <div className="p-4 space-y-4 h-64 bg-background">
                  {/* Assistant Message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: config.theme_color }}>
                      <SelectedIcon className="w-4 h-4" />
                    </div>
                    <div className="max-w-[75%] px-3 py-2 rounded-xl text-sm bg-[var(--surface-container)] text-[var(--on-surface)] rounded-tl-none">
                      {config.welcome_message}
                    </div>
                  </div>
                  {/* User Message */}
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: config.theme_color }}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="max-w-[75%] px-3 py-2 rounded-xl text-sm text-white rounded-tr-none" style={{ backgroundColor: config.theme_color }}>
                      I'm looking for a product.
                    </div>
                  </div>
                </div>
                
                <div className="p-3 border-t border-[var(--outline-variant)] bg-[var(--surface)]">
                  <div className="flex gap-2">
                    <Input disabled placeholder="Ask about products..." className="flex-1 rounded-full text-xs h-9 pointer-events-none" />
                    <Button disabled size="icon" className="h-9 w-9 rounded-full text-white pointer-events-none" style={{ backgroundColor: config.theme_color }}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Bubble Button Preview */}
              <div 
                className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white cursor-not-allowed"
                style={{ backgroundColor: config.theme_color }}
              >
                <SelectedIcon className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
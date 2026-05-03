"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Key, Save, RefreshCw, ShieldAlert } from "lucide-react"
import { getAdminSettings, updateAdminSettings, getModels, AIModel } from "@/lib/api"

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState({ type: "", text: "" })

  const [activeLlmModels, setActiveLlmModels] = useState<AIModel[]>([])
  const [activeEmbeddingModels, setActiveEmbeddingModels] = useState<AIModel[]>([])

  const [config, setConfig] = useState({
    default_llm_model: "",
    default_embedding_model: "",
    default_welcome_message: "",
    default_system_prompt: "",
    supreme_system_prompt: "", 
    groq_api_key: "",
    maintenance_mode: false,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsData, modelsData] = await Promise.all([
          getAdminSettings(),
          getModels(true) // Recuerda pasar 'true' para que el admin vea todos
        ])

        if (modelsData) {
          setActiveLlmModels(modelsData.filter(m => m.is_active && m.type === "llm"))
          setActiveEmbeddingModels(modelsData.filter(m => m.is_active && m.type === "embedding"))
        }

        if (settingsData) {
          setConfig({
            default_llm_model: settingsData.default_llm_model || "",
            default_embedding_model: settingsData.default_embedding_model || "",
            default_welcome_message: settingsData.default_welcome_message || "",
            default_system_prompt: settingsData.default_system_prompt || "",
            supreme_system_prompt: settingsData.supreme_system_prompt || "",
            groq_api_key: settingsData.groq_api_key || "",
            maintenance_mode: settingsData.maintenance_mode || false,
          })
        }
      } catch (error) {
        setMessage({ type: "error", text: "Error al cargar la configuración. Revisa tu conexión." })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage({ type: "", text: "" })
    try {
      await updateAdminSettings(config)
      setMessage({ type: "success", text: "¡Configuración global guardada con éxito!" })
      setTimeout(() => setMessage({ type: "", text: "" }), 3000)
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar la configuración." })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Global Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure default settings and global security rules.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general" className="gap-2"><Settings className="h-4 w-4" /><span>AI Defaults</span></TabsTrigger>
          <TabsTrigger value="api" className="gap-2"><Key className="h-4 w-4" /><span>Master API Keys</span></TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default AI Models</CardTitle>
              <CardDescription>These models will be assigned to new users by default.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ... Selectores de modelos (LLM y Embedding) que ya tenías ... */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default LLM Model</Label>
                  <Select value={config.default_llm_model} onValueChange={(val) => setConfig({...config, default_llm_model: val})}>
                    <SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger>
                    <SelectContent>
                      {activeLlmModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Embedding Model</Label>
                  <Select value={config.default_embedding_model} onValueChange={(val) => setConfig({...config, default_embedding_model: val})}>
                    <SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger>
                    <SelectContent>
                      {activeEmbeddingModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NUEVA SECCIÓN: REGLAS DE SEGURIDAD (SUPREME PROMPT) */}
          <Card className="border-red-200 shadow-sm">
            <CardHeader className="bg-red-50/50 rounded-t-xl border-b border-red-100">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Supreme System Prompt (Global Rules)
              </CardTitle>
              <CardDescription className="text-red-600/80">
                This prompt is secretly injected into ALL tenant chatbots to prevent hallucinations and enforce strict catalog rules. Tenants cannot see or edit this.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Textarea
                rows={8}
                value={config.supreme_system_prompt}
                onChange={(e) => setConfig({...config, supreme_system_prompt: e.target.value})}
                className="font-mono text-sm border-red-200 focus-visible:ring-red-500"
                placeholder="CRITICAL RULES: 1. You MUST ONLY recommend..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Default Prompts</CardTitle>
              <CardDescription>Set the base personality and greeting for new tenants (They CAN edit this later).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Default Welcome Message</Label>
                <Textarea rows={2} value={config.default_welcome_message} onChange={(e) => setConfig({...config, default_welcome_message: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Default System Prompt (Personality)</Label>
                <Textarea rows={4} value={config.default_system_prompt} onChange={(e) => setConfig({...config, default_system_prompt: e.target.value})} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Master API Configuration</CardTitle>
              <CardDescription>
                Configure the core provider keys used by the Inference Microservice.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="groq-key">Groq API Key (Master)</Label>
                <Input 
                  id="groq-key" 
                  type="password" 
                  placeholder="gsk_..." 
                  value={config.groq_api_key}
                  onChange={(e) => setConfig({...config, groq_api_key: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This key will be used to generate inferences for all tenants.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
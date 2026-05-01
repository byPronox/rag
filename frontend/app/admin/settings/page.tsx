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
import { Settings, Key, Save, RefreshCw } from "lucide-react"
import { getAdminSettings, updateAdminSettings } from "@/lib/api" // Asegúrate de importar esto

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState({ type: "", text: "" })

  const [config, setConfig] = useState({
    default_llm_model: "llama3-8b-8192",
    default_embedding_model: "all-MiniLM-L6-v2",
    default_welcome_message: "",
    default_system_prompt: "",
    groq_api_key: "",
    maintenance_mode: false,
  })

  // Cargar la configuración desde la base de datos al abrir la página
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getAdminSettings()
        if (data) {
          setConfig({
            default_llm_model: data.default_llm_model || "llama3-8b-8192",
            default_embedding_model: data.default_embedding_model || "all-MiniLM-L6-v2",
            default_welcome_message: data.default_welcome_message || "",
            default_system_prompt: data.default_system_prompt || "",
            groq_api_key: data.groq_api_key || "",
            maintenance_mode: data.maintenance_mode || false,
          })
        }
      } catch (error) {
        setMessage({ type: "error", text: "Error al cargar la configuración. Revisa tu conexión." })
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // Guardar la configuración en la base de datos
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Global Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure default settings for all new tenants in the RAG platform.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span>AI Defaults</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            <span>Master API Keys</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default AI Models</CardTitle>
              <CardDescription>
                These models will be assigned to new users by default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="default-llm">Default LLM Model</Label>
                <Select 
                  value={config.default_llm_model} 
                  onValueChange={(val) => setConfig({...config, default_llm_model: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama3-8b-8192">Llama 3 8B (Groq Fast)</SelectItem>
                    <SelectItem value="llama3-70b-8192">Llama 3 70B (Groq Advanced)</SelectItem>
                    <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B (Groq)</SelectItem>
                    <SelectItem value="gemma-7b-it">Gemma 7B IT (Groq)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-embedding">Default Embedding Model</Label>
                <Select 
                  value={config.default_embedding_model}
                  onValueChange={(val) => setConfig({...config, default_embedding_model: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-MiniLM-L6-v2">all-MiniLM-L6-v2 (Standard)</SelectItem>
                    {/* Add more embedding models here if your Python backend supports them */}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Prompts</CardTitle>
              <CardDescription>
                Set the base personality and greeting for all new tenant chatbots.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="default-welcome">Default Welcome Message</Label>
                <Textarea
                  id="default-welcome"
                  rows={2}
                  value={config.default_welcome_message}
                  onChange={(e) => setConfig({...config, default_welcome_message: e.target.value})}
                  placeholder="Hello! How can I help you today?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-system-prompt">Default System Prompt</Label>
                <Textarea
                  id="default-system-prompt"
                  rows={5}
                  value={config.default_system_prompt}
                  onChange={(e) => setConfig({...config, default_system_prompt: e.target.value})}
                  placeholder="You are an expert sales assistant..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings */}
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
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Sparkles, Settings2, RefreshCw } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { getModels, updateModel, syncModels, AIModel } from "@/lib/api"

function ModelCard({ model, onToggle }: { model: AIModel; onToggle: (model: AIModel) => void }) {
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)
    await onToggle(model)
    setIsToggling(false)
  }

  return (
    <Card className={!model.is_active ? "opacity-60 bg-muted/30" : ""}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                model.type === "llm"
                  ? "bg-primary/10 text-primary"
                  : "bg-green-500/10 text-green-600"
              }`}
            >
              {model.type === "llm" ? (
                <Brain className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">{model.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                  {model.provider}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 text-mono text-xs">ID: {model.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isToggling ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Switch
                checked={model.is_active}
                onCheckedChange={handleToggle}
              />
            )}
            <Button variant="ghost" size="icon" disabled>
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ModelsPage() {
  const [models, setModels] = useState<AIModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Cargar modelos desde el Backend
  const fetchModels = async () => {
    setIsLoading(true)
    try {
      const data = await getModels()
      setModels(data)
    } catch (error) {
      console.error("Error fetching models:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  // Actualizar el estado en la base de datos cuando se apaga/prende un switch
  const handleToggleModel = async (model: AIModel) => {
    try {
      const updatedModel = await updateModel(model.id, { is_active: !model.is_active })
      setModels((prev) => prev.map((m) => (m.id === model.id ? updatedModel : m)))
    } catch (error) {
      alert("Error al actualizar el estado del modelo.")
    }
  }

  // Función para pedirle al backend que descargue la lista fresca de Groq
  const handleSyncModels = async () => {
    setIsSyncing(true)
    try {
      // Usamos tu función de api.ts que YA tiene las credenciales configuradas
      await syncModels() 
      await fetchModels()
    } catch (error) {
      alert("Error sincronizando modelos con Groq.")
    } finally {
      setIsSyncing(false)
    }
  }

  const llmModels = models.filter((m) => m.type === "llm")
  const embeddingModels = models.filter((m) => m.type === "embedding")

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="w-8 h-8 text-primary" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI Models</h1>
          <p className="text-muted-foreground mt-1">
            Manage models available to your tenants.
          </p>
        </div>
        <Button onClick={handleSyncModels} disabled={isSyncing} className="gap-2" variant="outline">
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing with Groq..." : "Sync Models from API"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{models.length}</div>
            <p className="text-sm text-muted-foreground">Total Models in DB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold text-green-600">
              {models.filter((m) => m.is_active).length}
            </div>
            <p className="text-sm text-muted-foreground">Active Models</p>
          </CardContent>
        </Card>
      </div>

      {/* Models Tabs */}
      <Tabs defaultValue="llm" className="space-y-4">
        <TabsList>
          <TabsTrigger value="llm" className="gap-2">
            <Brain className="h-4 w-4" />
            LLM Models ({llmModels.length})
          </TabsTrigger>
          <TabsTrigger value="embedding" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Embedding Models ({embeddingModels.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="space-y-4">
          <div className="space-y-4">
            {llmModels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">No LLM models found. Click "Sync Models from API" to fetch from Groq.</div>
            ) : (
              llmModels.map((model) => (
                <ModelCard key={model.id} model={model} onToggle={handleToggleModel} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="embedding" className="space-y-4">
          <div className="space-y-4">
            {embeddingModels.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">No Embedding models found in DB.</div>
            ) : (
              embeddingModels.map((model) => (
                <ModelCard key={model.id} model={model} onToggle={handleToggleModel} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
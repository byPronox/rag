"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Brain, Sparkles, Settings2 } from "lucide-react"

interface AIModel {
  id: string
  name: string
  provider: string
  type: "llm" | "embedding"
  is_active: boolean
  description: string
  context_window?: number
  dimensions?: number
}

// Placeholder data
const mockLLMModels: AIModel[] = [
  {
    id: "llama3-8b-8192",
    name: "Llama 3 8B",
    provider: "Groq",
    type: "llm",
    is_active: true,
    description: "Fast inference LLM model from Meta, optimized for speed.",
    context_window: 8192,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    type: "llm",
    is_active: true,
    description: "Latest GPT-4 model with improved performance and lower costs.",
    context_window: 128000,
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    type: "llm",
    is_active: false,
    description: "Balanced Claude model for various tasks.",
    context_window: 200000,
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    type: "llm",
    is_active: false,
    description: "Google's most capable model for text generation.",
    context_window: 32000,
  },
]

const mockEmbeddingModels: AIModel[] = [
  {
    id: "all-MiniLM-L6-v2",
    name: "all-MiniLM-L6-v2",
    provider: "Sentence Transformers",
    type: "embedding",
    is_active: true,
    description: "Fast and efficient embedding model for semantic search.",
    dimensions: 384,
  },
  {
    id: "text-embedding-3-small",
    name: "text-embedding-3-small",
    provider: "OpenAI",
    type: "embedding",
    is_active: false,
    description: "OpenAI's small embedding model with good performance.",
    dimensions: 1536,
  },
  {
    id: "text-embedding-3-large",
    name: "text-embedding-3-large",
    provider: "OpenAI",
    type: "embedding",
    is_active: false,
    description: "OpenAI's large embedding model for best quality.",
    dimensions: 3072,
  },
]

function AddModelDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Model
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New AI Model</DialogTitle>
          <DialogDescription>
            Configure a new AI model for users to select.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-id">Model ID</Label>
            <Input id="model-id" placeholder="e.g., gpt-4-turbo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-name">Display Name</Label>
            <Input id="model-name" placeholder="e.g., GPT-4 Turbo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
                <SelectItem value="sentence-transformers">Sentence Transformers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Model Type</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="llm">LLM (Language Model)</SelectItem>
                <SelectItem value="embedding">Embedding Model</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="Brief description of the model" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Model</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ModelCard({ model, onToggle }: { model: AIModel; onToggle: (id: string) => void }) {
  return (
    <Card className={!model.is_active ? "opacity-60" : ""}>
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
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {model.provider}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {model.context_window && (
                  <span>Context: {(model.context_window / 1000).toFixed(0)}K tokens</span>
                )}
                {model.dimensions && <span>Dimensions: {model.dimensions}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={model.is_active}
              onCheckedChange={() => onToggle(model.id)}
            />
            <Button variant="ghost" size="icon">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ModelsPage() {
  const [llmModels, setLLMModels] = useState(mockLLMModels)
  const [embeddingModels, setEmbeddingModels] = useState(mockEmbeddingModels)

  const toggleLLMModel = (id: string) => {
    setLLMModels((models) =>
      models.map((m) => (m.id === id ? { ...m, is_active: !m.is_active } : m))
    )
  }

  const toggleEmbeddingModel = (id: string) => {
    setEmbeddingModels((models) =>
      models.map((m) => (m.id === id ? { ...m, is_active: !m.is_active } : m))
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI Models</h1>
          <p className="text-muted-foreground mt-1">
            Configure and manage available AI models for users.
          </p>
        </div>
        <AddModelDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">
              {llmModels.length + embeddingModels.length}
            </div>
            <p className="text-sm text-muted-foreground">Total Models</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold text-green-600">
              {llmModels.filter((m) => m.is_active).length +
                embeddingModels.filter((m) => m.is_active).length}
            </div>
            <p className="text-sm text-muted-foreground">Active Models</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold text-primary">4</div>
            <p className="text-sm text-muted-foreground">Providers</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Language Models</CardTitle>
              <CardDescription>
                Configure LLM models available for chat and text generation.
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="space-y-4">
            {llmModels.map((model) => (
              <ModelCard key={model.id} model={model} onToggle={toggleLLMModel} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="embedding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Embedding Models</CardTitle>
              <CardDescription>
                Configure embedding models for semantic search and RAG.
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="space-y-4">
            {embeddingModels.map((model) => (
              <ModelCard key={model.id} model={model} onToggle={toggleEmbeddingModel} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

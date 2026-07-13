"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Save, Code, Search, Store, Check, Sparkles, ShoppingBag, ArrowRight } from "lucide-react"

// Importaciones de API y Contexto Multi-Compañía
import { getCompanyConfig, updateCompanyConfig, CompanyConfig, RAG_API_URL } from "@/lib/api"
import { useCompany } from "@/lib/company-context"

const PRESET_COLORS = [
  { name: "Purple (Default)", value: "#8b5cf6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Orange", value: "#f97316" },
  { name: "Slate", value: "#64748b" },
]

export default function SemanticSearchConfigPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(true) // Controla el estado del preview

  // Extraemos el estado global de la compañía activa
  const { activeCompany, isLoadingCompanies } = useCompany()

  const [config, setConfig] = useState({
    theme_color: "#8b5cf6",
    system_api_key: "your_master_api_key_here" // Idealmente, traer del contexto de Auth/User
  })

  // Cargar la configuración de la compañía seleccionada
  useEffect(() => {
    if (isLoadingCompanies || !activeCompany) return;

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const companyConf = await getCompanyConfig(activeCompany.company_id)
        if (companyConf) {
          setConfig(prev => ({
            ...prev,
            theme_color: companyConf.theme_color || "#8b5cf6",
          }))
        }
      } catch (error) {
        console.error("Error loading config:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [activeCompany, isLoadingCompanies])

  const handleSave = async () => {
    if (!activeCompany) return;

    setIsSaving(true)
    try {
      // Guardamos el color (que se comparte con el chatbot para consistencia de marca)
      await updateCompanyConfig(activeCompany.company_id, { theme_color: config.theme_color } as Partial<CompanyConfig>)
      alert("Search Widget configuration saved successfully!")
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

  // Generador del Script de Búsqueda (Similar al chatbot pero para inyectar una barra de búsqueda)
  const embedCode = `
<div id="rag-search-bar-container"></div>
<script>
  window.RAG_SEARCH_CONFIG = {
    apiKey: "${config.system_api_key}",
    companyId: "${activeCompany?.company_id || 'ERROR_NO_COMPANY'}",
    color: "${config.theme_color}",
    apiUrl: "${RAG_API_URL}"
  };
</script>
<script src="https://rag-frontend-tan.vercel.app/search-widget.js" async></script>
`.trim()

  if (isLoadingCompanies || isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    )
  }

  if (!activeCompany) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] space-y-4">
        <Store className="w-16 h-16 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold">No Companies Found</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You need to sync at least one company from your Odoo panel before configuring the search widget.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Semantic Search Widget</h1>
          <p className="text-muted-foreground mt-1">Configure {activeCompany.name}'s smart search bar and get the embed code.</p>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Code className="w-4 h-4" /> Embed Search Bar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Embed on your website</DialogTitle>
                <DialogDescription>
                  Copy and paste this code exactly where you want the Search Bar to appear in your e-commerce header or navigation.
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
              <CardTitle>Appearance & Brand</CardTitle>
              <CardDescription>Match the search widget with your brand colors. This color is shared with your chatbot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Picker */}
              <div className="space-y-3">
                <Label>Brand Accent Color</Label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setConfig({ ...config, theme_color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${config.theme_color === color.value ? 'scale-110 border-foreground shadow-md' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-4 border-l pl-4 border-muted">
                    <Input
                      type="color"
                      value={config.theme_color}
                      onChange={(e) => setConfig({ ...config, theme_color: e.target.value })}
                      className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground font-mono uppercase">{config.theme_color}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border mt-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold">How it works</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unlike traditional keyword search, our Semantic Search understands context and synonyms. If a customer types "device for listening to music while running", it will show sports earphones even if those exact words aren't in the title.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Preview */}
        <div className="flex flex-col items-center pt-8">
          <div className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-widest">Live Preview</div>

          {/* Mock E-commerce Header */}
          <div className="w-full max-w-[450px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl shadow-2xl relative flex flex-col overflow-visible">

            {/* Fake Website Navbar */}
            <div className="h-16 bg-background border-b border-border flex items-center px-6 gap-6 rounded-t-xl z-20 relative">
              <div className="font-bold text-xl tracking-tight">STORE</div>

              {/* THE SEARCH BAR PREVIEW */}
              <div className="flex-1 relative">
                <div
                  className={`flex items-center h-10 px-3 bg-muted/50 rounded-full border transition-all cursor-text ${isSearchFocused ? 'ring-2 ring-opacity-20 border-transparent' : 'border-border hover:border-muted-foreground/30'}`}
                  style={{
                    borderColor: isSearchFocused ? config.theme_color : undefined,
                    boxShadow: isSearchFocused ? `0 0 0 3px ${config.theme_color}20` : undefined
                  }}
                  onClick={() => setIsSearchFocused(true)}
                  onMouseLeave={() => setIsSearchFocused(false)}
                >
                  <Search className="w-4 h-4 text-muted-foreground mr-2" />
                  <span className="text-sm text-foreground flex-1">red running shoes...</span>
                  {isSearchFocused && <Spinner className="w-3 h-3 text-muted-foreground" />}
                </div>

                {/* THE DROPDOWN RESULTS PREVIEW */}
                {isSearchFocused && (
                  <div className="absolute top-[120%] left-0 w-[350px] bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" style={{ color: config.theme_color }} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Semantic Results</span>
                    </div>

                    <div className="p-2 space-y-1">
                      {/* Fake Product 1 */}
                      <div className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0 border border-border">
                          <ShoppingBag className="w-5 h-5 text-muted-foreground opacity-50" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors" style={{ color: config.theme_color }}>
                            Nike Air Zoom Pegasus 39
                          </p>
                          <p className="text-xs text-muted-foreground">$120.00</p>
                        </div>
                      </div>

                      {/* Fake Product 2 */}
                      <div className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0 border border-border">
                          <ShoppingBag className="w-5 h-5 text-muted-foreground opacity-50" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors" style={{ color: config.theme_color }}>
                            Adidas Ultraboost 22 (Crimson)
                          </p>
                          <p className="text-xs text-muted-foreground">$190.00</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-border bg-muted/10">
                      <button className="w-full flex items-center justify-center gap-2 text-xs font-medium hover:underline transition-all" style={{ color: config.theme_color }}>
                        View all 12 results <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fake Website Body */}
            <div className="h-64 p-6 opacity-30 pointer-events-none rounded-b-xl bg-background" onClick={() => setIsSearchFocused(false)}>
              <div className="h-32 w-full bg-muted rounded-xl mb-4" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 bg-muted rounded-xl" />
                <div className="h-24 bg-muted rounded-xl" />
                <div className="h-24 bg-muted rounded-xl" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Download,
  TrendingUp,
  MessageSquare,
  Search,
  Cpu,
  Clock,
  Users,
  Calendar,
} from "lucide-react"
import { useState, useEffect } from "react"
import { getSystemMetrics, SystemMetrics } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"

// Simple bar chart component (Actualizado para manejar datos vacíos)
function BarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-sm text-muted-foreground border border-dashed rounded-md">No historical data available yet</div>
  }

  return (
    <div className="flex items-end justify-between gap-2 h-48">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full bg-primary/20 hover:bg-primary/30 transition-colors rounded-t"
            style={{ height: `${(item.value / maxValue) * 100}%` }}
          />
          <span className="text-[10px] text-muted-foreground uppercase">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// Simple line visualization (Mantenemos el estilo visual como placeholder del gráfico)
function TrendLine() {
  return (
    <div className="h-32 relative">
      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 100">
        <path
          d="M0,80 L50,70 L100,75 L150,50 L200,40 L250,45 L300,20 L350,30 L400,10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary opacity-20" /* Bajamos la opacidad hasta tener datos reales en el futuro */
        />
        <path
          d="M0,80 L50,70 L100,75 L150,50 L200,40 L250,45 L300,20 L350,30 L400,10 L400,100 L0,100 Z"
          fill="url(#gradient)"
          opacity="0.05"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "currentColor" }} />
            <stop offset="100%" style={{ stopColor: "currentColor", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export default function MetricsPage() {
  const [timeRange, setTimeRange] = useState("7d")
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<SystemMetrics>({
    total_rag_queries: 0,
    total_search_queries: 0,
    total_tokens: 0,
    avg_latency_sec: 0,
    top_queries: [],
    user_activity: []
  })

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true)
      try {
        const data = await getSystemMetrics()
        if (data) {
          setMetrics(data)
        }
      } catch (error) {
        console.error("Error fetching metrics:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMetrics()
  }, [timeRange])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  // Helper para formatear tokens grandes (Ej: 1500 -> 1.5K, 2000000 -> 2.0M)
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return (tokens / 1000000).toFixed(1) + "M"
    if (tokens >= 1000) return (tokens / 1000).toFixed(1) + "K"
    return tokens.toString()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">System Metrics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor system performance and usage analytics directly from the database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics - REAL DATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Total RAG Queries</span>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-semibold">{metrics.total_rag_queries.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              Total queries in database
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Search Queries</span>
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-semibold">{metrics.total_search_queries.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              Total semantic searches
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Token Usage</span>
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-semibold">{formatTokens(metrics.total_tokens)}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              Aggregated across all tenants
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Avg Response Time</span>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-semibold">{metrics.avg_latency_sec}s</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              Calculated from Groq inferences
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Chat Activity</CardTitle>
            <CardDescription>RAG queries history (Awaiting timeline endpoint)</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Pasamos un array vacío para que NO haya datos falsos */}
            <BarChart data={[]} maxValue={300} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search Volume</CardTitle>
            <CardDescription>Semantic search requests trend</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLine />
            <div className="flex justify-between mt-4 text-[10px] text-muted-foreground uppercase opacity-50">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row - REAL DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Search Queries */}
        <Card>
          <CardHeader>
            <CardTitle>Top Search Queries</CardTitle>
            <CardDescription>Most popular search terms in database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.top_queries.length === 0 ? (
                <div className="text-sm text-center py-6 text-muted-foreground border border-dashed rounded-md">
                  No search queries recorded yet.
                </div>
              ) : (
                metrics.top_queries.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.query}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.hits.toLocaleString()} hits
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Relevance</p>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${item.relevance}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-primary">{item.relevance}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>Tenants with the most interactions</CardDescription>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.user_activity.length === 0 ? (
                <div className="text-sm text-center py-6 text-muted-foreground border border-dashed rounded-md">
                  No user activity recorded yet.
                </div>
              ) : (
                metrics.user_activity.map((user, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.queries.toLocaleString()} queries
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatTokens(user.tokens)}
                      </p>
                      <p className="text-xs text-muted-foreground">tokens</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health (Static visually, waiting for real infrastructure endpoint in future) */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Real-time system status and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium">API Gateway</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium">RAG Service</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium">Vector Database</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium">LLM Provider</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
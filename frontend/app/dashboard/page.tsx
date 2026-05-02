"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  MessageSquare,
  Search,
  Package,
  Activity,
  TrendingUp,
  ArrowUpRight,
  Code,
  Download
} from "lucide-react"

// Metric card component - Exactamente igual al del admin
function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  trendLabel,
}: {
  title: string
  value: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  trendLabel?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-3xl font-semibold text-foreground">{value}</div>
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                trend === "up"
                  ? "text-green-600"
                  : trend === "down"
                  ? "text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {trend === "up" && <TrendingUp className="h-4 w-4" />}
              {trendValue} {trendLabel}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Activity row component (Reemplaza a UserRow para el panel de usuario)
function ActivityRow({
  type,
  detail,
  status,
  time,
}: {
  type: string
  detail: string
  status: string
  time: string
}) {
  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${
          type === 'Chat' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
          type === 'Búsqueda' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 
          'bg-green-500/10 text-green-500 border-green-500/20'
        }`}>
          {type}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-foreground">{detail}</td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-foreground border border-border">
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-right text-sm text-muted-foreground">
        {time}
      </td>
    </tr>
  )
}

export default function UserDashboardPage() {
  const metrics = [
    {
      title: "Interacciones del Chatbot",
      value: "1,248",
      icon: MessageSquare,
      trend: "up" as const,
      trendValue: "+14%",
      trendLabel: "esta semana",
    },
    {
      title: "Búsquedas Realizadas",
      value: "8,392",
      icon: Search,
      trend: "up" as const,
      trendValue: "+22%",
      trendLabel: "esta semana",
    },
    {
      title: "Productos Exportados",
      value: "156",
      icon: Package,
      trend: "up" as const,
      trendValue: "+5%",
      trendLabel: "este mes",
    },
    {
      title: "Precisión de la IA",
      value: "96.4%",
      icon: Activity,
      trend: "up" as const,
      trendValue: "+1.2%",
      trendLabel: "vs semana pasada",
    },
  ]

  const recentActivity = [
    { type: "Chat", detail: "Usuario preguntó por 'Políticas de devolución'", time: "Hace 5 min", status: "Resuelto" },
    { type: "Búsqueda", detail: "Término: 'Laptops gaming'", time: "Hace 15 min", status: "Completado" },
    { type: "Sistema", detail: "Script de Chatbot actualizado (Tema: Oscuro)", time: "Hace 2 horas", status: "Desplegado" },
    { type: "Chat", detail: "Usuario solicitó 'Soporte técnico'", time: "Hace 3 horas", status: "Derivado" },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Panel de Control</h1>
          <p className="text-muted-foreground mt-1">
            Métricas y estado general de tu integración en el e-commerce.
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Reporte
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent History Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Actividad Reciente</CardTitle>
              <Button variant="link" className="gap-1 text-primary">
                Ver Todo <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-y border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Detalle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tiempo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentActivity.map((activity, index) => (
                      <ActivityRow key={index} {...activity} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                <span>Mostrando 4 actividades recientes</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions / Scripts */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scripts de Implementación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Genera o copia los scripts necesarios para tu e-commerce.
              </p>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Code className="h-4 w-4" />
                Obtener Script del Chatbot
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Search className="h-4 w-4" />
                Obtener Script de Búsqueda
              </Button>
            </CardContent>
          </Card>

          {/* Quick Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" className="w-full justify-start gap-2 border border-border/50">
                <MessageSquare className="h-4 w-4" />
                Editar Mensaje de Bienvenida
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2 border border-border/50">
                <Package className="h-4 w-4" />
                Sincronizar Productos Manualmente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
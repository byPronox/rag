"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useCompany } from "@/lib/company-context"
import { getDashboardMetrics, DashboardMetrics, ActivityItem } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { formatDistanceToNow } from "date-fns"
import {
  MessageSquare,
  Search,
  Package,
  Activity,
  ArrowUpRight,
  Code,
  Download,
  Settings2,
  Cpu
} from "lucide-react"

// Metric card component
function MetricCard({
  title,
  value,
  icon: Icon,
  description
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
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
          {description && (
            <div className="text-xs text-muted-foreground mt-2">
              {description}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Activity row component
function ActivityRow({
  type,
  detail,
  status,
  time,
}: ActivityItem) {
  
  // Try to parse ISO string to a human-readable format if it's a date string
  let displayTime = time;
  try {
    if (time && time.includes('T')) {
      displayTime = formatDistanceToNow(new Date(time), { addSuffix: true });
    }
  } catch (e) {
    // keep original string if parsing fails
  }

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${
          type === 'Chat' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
          type === 'Search' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 
          'bg-green-500/10 text-green-500 border-green-500/20'
        }`}>
          {type}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">{detail}</td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-foreground border border-border">
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-right text-sm text-muted-foreground whitespace-nowrap">
        {displayTime}
      </td>
    </tr>
  )
}

export default function UserDashboardPage() {
  const { activeCompany, isLoadingCompanies } = useCompany()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function fetchMetrics() {
      if (activeCompany) {
        setIsLoading(true)
        try {
          const data = await getDashboardMetrics(activeCompany.company_id)
          setMetrics(data)
        } catch (error) {
          console.error("Error fetching dashboard metrics:", error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setMetrics(null)
      }
    }

    fetchMetrics()
  }, [activeCompany])

  if (isLoadingCompanies || !metrics) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
           {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>

        <div className="grid gap-6 md:grid-cols-7">
           <Skeleton className="md:col-span-4 h-[400px] w-full" />
           <Skeleton className="md:col-span-3 h-[400px] w-full" />
        </div>
      </div>
    )
  }

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <Activity className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">No Company Selected</h2>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Please select a company from the sidebar to view its metrics.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">
            Real-time metrics for <span className="font-medium text-foreground">{activeCompany.name}</span>
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 print:hidden">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <MetricCard 
            title="Chatbot Interactions" 
            value={metrics?.total_chats || 0} 
            icon={MessageSquare} 
            description="Total messages sent by users"
         />
         <MetricCard 
            title="Searches Performed" 
            value={metrics?.total_searches || 0} 
            icon={Search} 
            description="Total semantic searches"
         />
         <MetricCard 
            title="Exported Products" 
            value={metrics?.total_products || 0} 
            icon={Package} 
            description="Active products in vector DB"
         />
         <MetricCard 
            title="Tokens Consumed" 
            value={metrics?.tokens_used?.toLocaleString() || 0} 
            icon={Cpu} 
            description="Total LLM tokens processed"
         />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent History Table */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Link href="/dashboard/history">
                <Button variant="link" className="gap-1 text-primary">
                  View All <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-y border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Detail
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {metrics?.recent_activity?.length ? (
                      metrics.recent_activity.map((activity, index) => (
                        <ActivityRow key={index} {...activity} />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">
                          No recent activity found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            {metrics?.recent_activity?.length ? (
              <div className="px-6 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {metrics.recent_activity.length} recent activities</span>
              </div>
            ) : null}
          </Card>
        </div>

        {/* Quick Actions / Scripts */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Implementation Scripts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Generate or copy the necessary scripts for your e-commerce.
              </p>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Code className="h-4 w-4" />
                Get Chatbot Script
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Search className="h-4 w-4" />
                Get Search Script
              </Button>
            </CardContent>
          </Card>

          {/* Quick Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/products" passHref>
                <Button variant="ghost" className="w-full justify-start gap-2 border border-border/50 mb-3">
                  <Package className="h-4 w-4 text-primary" />
                  View Exported Products
                </Button>
              </Link>
              <Link href="/dashboard/chatbot" passHref>
                <Button variant="ghost" className="w-full justify-start gap-2 border border-border/50">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Configure Chatbot
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
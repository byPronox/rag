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

// Metric card component
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
              {trendValue} <span className="text-muted-foreground ml-1">{trendLabel}</span>
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
          type === 'Search' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 
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
      title: "Chatbot Interactions",
      value: "1,248",
      icon: MessageSquare,
      trend: "up" as const,
      trendValue: "+14%",
      trendLabel: "this week",
    },
    {
      title: "Searches Performed",
      value: "8,392",
      icon: Search,
      trend: "up" as const,
      trendValue: "+22%",
      trendLabel: "this week",
    },
    {
      title: "Exported Products",
      value: "156",
      icon: Package,
      trend: "up" as const,
      trendValue: "+5%",
      trendLabel: "this month",
    },
    {
      title: "AI Accuracy",
      value: "96.4%",
      icon: Activity,
      trend: "up" as const,
      trendValue: "+1.2%",
      trendLabel: "vs last week",
    },
  ]

  const recentActivity = [
    { type: "Chat", detail: "User asked for 'Return policies'", time: "5 min ago", status: "Resolved" },
    { type: "Search", detail: "Term: 'Gaming laptops'", time: "15 min ago", status: "Completed" },
    { type: "System", detail: "Chatbot script updated (Dark Theme)", time: "2 hours ago", status: "Deployed" },
    { type: "Chat", detail: "User requested 'Technical support'", time: "3 hours ago", status: "Escalated" },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">
            Metrics and general status of your e-commerce integration.
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
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
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button variant="link" className="gap-1 text-primary">
                View All <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
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
                    {recentActivity.map((activity, index) => (
                      <ActivityRow key={index} {...activity} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing 4 recent activities</span>
              </div>
            </CardContent>
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
              <Button variant="ghost" className="w-full justify-start gap-2 border border-border/50">
                <MessageSquare className="h-4 w-4" />
                Edit Welcome Message
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2 border border-border/50">
                <Package className="h-4 w-4" />
                Manually Sync Products
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
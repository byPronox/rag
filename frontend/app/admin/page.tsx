"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  MessageSquare,
  Cpu,
  Key,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  ArrowUpRight,
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
              {trend === "down" && <TrendingDown className="h-4 w-4" />}
              {trend === "neutral" && <Minus className="h-4 w-4" />}
              {trendValue} {trendLabel}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// User row component for the table
function UserRow({
  email,
  tenantId,
  role,
  model,
  isActive,
}: {
  email: string
  tenantId: string
  role: string
  model: string
  isActive: boolean
}) {
  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4">
        <div className="font-medium text-foreground">{email}</div>
        <div className="text-xs text-muted-foreground font-mono">{tenantId}</div>
      </td>
      <td className="px-6 py-4 text-sm text-foreground">{role}</td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-foreground border border-border">
          {model}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-10 h-5 rounded-full relative cursor-pointer ${
              isActive ? "bg-primary" : "bg-muted border border-border"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all ${
                isActive ? "right-0.5" : "left-0.5"
              }`}
            />
          </div>
          <span
            className={`text-xs font-medium ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </td>
    </tr>
  )
}

export default function AdminDashboardPage() {
  // Placeholder data - will be replaced with real API calls
  const metrics = [
    {
      title: "Active Users",
      value: "24",
      icon: Users,
      trend: "up" as const,
      trendValue: "+12%",
      trendLabel: "this month",
    },
    {
      title: "Token Consumption",
      value: "1.2M",
      icon: Cpu,
      trend: "up" as const,
      trendValue: "",
      trendLabel: "Peak usage detected",
    },
    {
      title: "Avg. AI Accuracy",
      value: "94.8%",
      icon: MessageSquare,
      trend: "up" as const,
      trendValue: "+0.4%",
      trendLabel: "vs last week",
    },
    {
      title: "Active API Keys",
      value: "42",
      icon: Key,
      trend: "neutral" as const,
      trendValue: "",
      trendLabel: "Stable",
    },
  ]

  const users = [
    {
      email: "acme_corp@example.com",
      tenantId: "tnt_001_x9f8",
      role: "Enterprise Admin",
      model: "GPT-4 Turbo",
      isActive: true,
    },
    {
      email: "globex_inc@example.com",
      tenantId: "tnt_042_m3k2",
      role: "Standard User",
      model: "Claude 3.5 Sonnet",
      isActive: false,
    },
    {
      email: "stark_ind@example.com",
      tenantId: "tnt_099_p1z5",
      role: "Enterprise Admin",
      model: "GPT-4o",
      isActive: true,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">System Overview</h1>
          <p className="text-muted-foreground mt-1">
            Global metrics and user configurations.
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
        {/* User Management Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">User Management</CardTitle>
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
                        Email / Tenant ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        LLM Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => (
                      <UserRow key={user.tenantId} {...user} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing 1-3 of 24 users</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Add New User
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Cpu className="h-4 w-4" />
                Configure AI Models
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Key className="h-4 w-4" />
                Generate API Key
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <p className="text-sm text-foreground">New user registered</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <p className="text-sm text-foreground">Model GPT-4o enabled</p>
                    <p className="text-xs text-muted-foreground">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                  <div>
                    <p className="text-sm text-foreground">API rate limit warning</p>
                    <p className="text-xs text-muted-foreground">1 hour ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

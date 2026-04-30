"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Download,
  Filter,
  MessageSquare,
  Search as SearchIcon,
  Eye,
  Calendar,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ChatLog {
  id: number
  session_id: string
  user_email: string
  messages: { role: string; content: string; timestamp: string }[]
  created_at: string
}

interface SearchLog {
  id: number
  user_email: string
  query: string
  results_count: number
  created_at: string
}

// Placeholder data
const mockChatLogs: ChatLog[] = [
  {
    id: 1,
    session_id: "S-98231",
    user_email: "empresa1@example.com",
    messages: [
      { role: "user", content: "How do I assemble the ergonomic chair?", timestamp: "10:30 AM" },
      { role: "assistant", content: "To assemble the ergonomic chair, follow these steps: 1. Attach the base to the gas cylinder...", timestamp: "10:30 AM" },
      { role: "user", content: "What tools do I need?", timestamp: "10:31 AM" },
      { role: "assistant", content: "You will need: Allen wrench (included), Phillips screwdriver, and...", timestamp: "10:31 AM" },
    ],
    created_at: "2024-03-20 10:30",
  },
  {
    id: 2,
    session_id: "S-98228",
    user_email: "empresa2@example.com",
    messages: [
      { role: "user", content: "Compare minimalist desk with the pro version", timestamp: "10:15 AM" },
      { role: "assistant", content: "Here's a comparison between the Minimalist Desk and Pro version...", timestamp: "10:15 AM" },
    ],
    created_at: "2024-03-20 10:15",
  },
  {
    id: 3,
    session_id: "S-98225",
    user_email: "empresa1@example.com",
    messages: [
      { role: "user", content: "Return policy for lighting fixtures", timestamp: "09:45 AM" },
      { role: "assistant", content: "Our return policy for lighting fixtures allows returns within 30 days...", timestamp: "09:45 AM" },
    ],
    created_at: "2024-03-20 09:45",
  },
]

const mockSearchLogs: SearchLog[] = [
  { id: 1, user_email: "empresa1@example.com", query: "minimalist desk", results_count: 12, created_at: "2024-03-20 11:00" },
  { id: 2, user_email: "empresa2@example.com", query: "ergonomic chair black", results_count: 8, created_at: "2024-03-20 10:55" },
  { id: 3, user_email: "empresa3@example.com", query: "led lamp adjustable", results_count: 15, created_at: "2024-03-20 10:50" },
  { id: 4, user_email: "empresa1@example.com", query: "wireless keyboard bluetooth", results_count: 6, created_at: "2024-03-20 10:45" },
  { id: 5, user_email: "empresa2@example.com", query: "monitor stand dual", results_count: 4, created_at: "2024-03-20 10:40" },
]

function ChatLogDialog({ log }: { log: ChatLog }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Eye className="h-4 w-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chat Session #{log.session_id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-3">
            <span>User: {log.user_email}</span>
            <span>{log.created_at}</span>
          </div>
          <div className="space-y-3">
            {log.messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary/10 ml-8"
                    : "bg-muted mr-8"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground capitalize">
                    {msg.role}
                  </span>
                  <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                </div>
                <p className="text-sm text-foreground">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterUser, setFilterUser] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("7d")

  // Get unique users for filter
  const uniqueUsers = [...new Set([
    ...mockChatLogs.map(l => l.user_email),
    ...mockSearchLogs.map(l => l.user_email)
  ])]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            View chat and search history across all users.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-semibold">{mockChatLogs.length}</div>
                <p className="text-sm text-muted-foreground">Chat Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <SearchIcon className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-semibold">{mockSearchLogs.length}</div>
                <p className="text-sm text-muted-foreground">Search Queries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-semibold">Today</div>
                <p className="text-sm text-muted-foreground">Most Recent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in logs..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Tabs */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat History
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <SearchIcon className="h-4 w-4" />
            Search History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Chat Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-y border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Session ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Last Message
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Messages
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mockChatLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-foreground">
                            #{log.session_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {log.user_email}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">
                          {log.messages[0]?.content}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {log.messages.length} messages
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {log.created_at}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ChatLogDialog log={log} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Search Queries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-y border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Query
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Results
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mockSearchLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-foreground">
                            #{log.id}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {log.user_email}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-foreground">
                            {log.query}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {log.results_count} results
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {log.created_at}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

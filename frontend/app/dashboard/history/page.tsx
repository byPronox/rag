"use client"

import { useState, useEffect, useMemo } from "react"
import { useCompany } from "@/lib/company-context"
import { getChatHistory, getSearchHistory, ChatMessage, SearchQuery } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Search, MessageSquare, Clock, User, Bot, History, Calendar } from "lucide-react"
import { format, parseISO } from "date-fns"

export default function HistoryPage() {
  const { activeCompany, isLoadingCompanies } = useCompany()
  
  const [activeTab, setActiveTab] = useState("chat")
  
  // Data States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchQuery[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Chat View States
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [chatSearchQuery, setChatSearchQuery] = useState("")
  const [searchSearchQuery, setSearchSearchQuery] = useState("")

  useEffect(() => {
    async function fetchHistory() {
      if (activeCompany) {
        setIsLoading(true)
        try {
          const [chats, searches] = await Promise.all([
            getChatHistory(activeCompany.company_id),
            getSearchHistory(activeCompany.company_id)
          ])
          setChatHistory(chats)
          setSearchHistory(searches)
          
          // Auto-select first session if chats exist
          if (chats.length > 0) {
            setSelectedSessionId(chats[chats.length - 1].session_id)
          }
        } catch (error) {
          console.error("Error fetching history:", error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setChatHistory([])
        setSearchHistory([])
        setSelectedSessionId(null)
      }
    }

    fetchHistory()
  }, [activeCompany])

  // Process Chat History into Sessions
  const chatSessions = useMemo(() => {
    const sessions = new Map<string, { lastMessageAt: string, messageCount: number, preview: string }>()
    
    chatHistory.forEach(msg => {
      if (!sessions.has(msg.session_id)) {
         sessions.set(msg.session_id, { 
             lastMessageAt: msg.created_at, 
             messageCount: 1,
             preview: msg.message 
         })
      } else {
         const current = sessions.get(msg.session_id)!
         current.messageCount += 1;
         // update last message time if this is newer
         if (new Date(msg.created_at) > new Date(current.lastMessageAt)) {
             current.lastMessageAt = msg.created_at
             current.preview = msg.message
         }
      }
    })

    const sortedSessions = Array.from(sessions.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

    // Apply Filter
    if (chatSearchQuery.trim()) {
        return sortedSessions.filter(s => s.id.toLowerCase().includes(chatSearchQuery.toLowerCase()) || s.preview.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    }
    return sortedSessions;
  }, [chatHistory, chatSearchQuery])

  // Get messages for active session
  const activeSessionMessages = useMemo(() => {
    if (!selectedSessionId) return []
    return chatHistory
      .filter(m => m.session_id === selectedSessionId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [chatHistory, selectedSessionId])

  // Filter Search History
  const filteredSearchHistory = useMemo(() => {
    if (!searchSearchQuery.trim()) return searchHistory
    return searchHistory.filter(s => s.query_text.toLowerCase().includes(searchSearchQuery.toLowerCase()) || (s.session_id && s.session_id.toLowerCase().includes(searchSearchQuery.toLowerCase())))
  }, [searchHistory, searchSearchQuery])


  // CSV Export Logic
  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    
    if (activeTab === "chat") {
      csvContent += "ID,Session_ID,Role,Message,Tokens_Used,Latency_ms,Created_At\n"
      chatHistory.forEach(row => {
        const cleanMsg = row.message.replace(/"/g, '""').replace(/\n/g, ' ')
        csvContent += `${row.id},${row.session_id},${row.role},"${cleanMsg}",${row.tokens_used || 0},${row.latency_ms || 0},${row.created_at}\n`
      })
    } else {
      csvContent += "ID,Session_ID,Query_Text,Created_At\n"
      searchHistory.forEach(row => {
        const cleanQuery = row.query_text.replace(/"/g, '""').replace(/\n/g, ' ')
        csvContent += `${row.id},${row.session_id || 'N/A'},"${cleanQuery}",${row.created_at}\n`
      })
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${activeCompany?.name}_${activeTab}_history.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Render format time safely
  const formatTimeSafe = (dateString: string) => {
      try {
          return format(parseISO(dateString), "MMM d, h:mm a")
      } catch (e) {
          return dateString
      }
  }


  if (isLoadingCompanies || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <History className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">No Company Selected</h2>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Please select a company from the sidebar to view its historical logs.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usage History</h1>
          <p className="text-muted-foreground mt-1">
            Review detailed logs and interactions for <span className="font-semibold text-foreground">{activeCompany.name}</span>
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2 bg-card">
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full overflow-hidden">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="chat" className="gap-2"><MessageSquare className="w-4 h-4" /> Chatbot History</TabsTrigger>
          <TabsTrigger value="search" className="gap-2"><Search className="w-4 h-4" /> Semantic Searches</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col h-full mt-0 border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Left Pane: Sessions List */}
            <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border flex flex-col bg-muted/20 overflow-hidden">
               <div className="p-4 border-b border-border bg-card shrink-0">
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input 
                     placeholder="Search sessions..." 
                     className="pl-9 bg-background"
                     value={chatSearchQuery}
                     onChange={(e) => setChatSearchQuery(e.target.value)}
                   />
                 </div>
               </div>
               <ScrollArea className="flex-1">
                 <div className="divide-y divide-border">
                   {chatSessions.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No chat sessions found.
                      </div>
                   ) : chatSessions.map((session) => (
                     <button
                       key={session.id}
                       onClick={() => setSelectedSessionId(session.id)}
                       className={`w-full text-left p-4 hover:bg-muted transition-colors flex flex-col gap-1 ${selectedSessionId === session.id ? 'bg-primary/10 hover:bg-primary/10 border-l-2 border-primary' : ''}`}
                     >
                       <div className="flex justify-between items-start w-full">
                         <span className="font-semibold text-sm truncate pr-2">Session: {session.id.substring(0,8)}...</span>
                         <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTimeSafe(session.lastMessageAt)}</span>
                       </div>
                       <p className="text-xs text-muted-foreground line-clamp-1">{session.preview}</p>
                       <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded w-fit mt-1 border border-border">
                         {session.messageCount} messages
                       </span>
                     </button>
                   ))}
                 </div>
               </ScrollArea>
            </div>

            {/* Right Pane: WhatsApp Style Chat Viewer */}
            <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
               {selectedSessionId ? (
                 <>
                   <div className="h-14 border-b border-border bg-card flex items-center px-6 sticky top-0 z-10 shadow-sm shrink-0">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                           <User className="w-4 h-4 text-primary" />
                         </div>
                         <div>
                            <h3 className="font-medium text-sm">Session Details</h3>
                            <p className="text-xs text-muted-foreground font-mono">{selectedSessionId}</p>
                         </div>
                      </div>
                   </div>
                   
                   <ScrollArea className="flex-1">
                     <div className="p-6 space-y-6 max-w-3xl mx-auto pb-8">
                       {activeSessionMessages.map((msg, i) => {
                         const isUser = msg.role === 'user'
                         return (
                           <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                             <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                               <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${isUser ? 'bg-primary/20' : 'bg-muted border border-border'}`}>
                                 {isUser ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
                               </div>
                               <div className="flex flex-col gap-1">
                                  <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                                      isUser 
                                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                        : 'bg-card border border-border rounded-tl-none text-card-foreground'
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                  </div>
                                  <div className={`flex items-center gap-2 text-[10px] text-muted-foreground px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    <span>{formatTimeSafe(msg.created_at)}</span>
                                    {!isUser && (
                                       <>
                                         <span>•</span>
                                         <span>{msg.tokens_used} tokens</span>
                                         <span>•</span>
                                         <span>{msg.latency_ms}ms</span>
                                       </>
                                    )}
                                  </div>
                               </div>
                             </div>
                           </div>
                         )
                       })}
                     </div>
                   </ScrollArea>
                 </>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium">Select a session</p>
                    <p className="text-sm">Choose a conversation from the sidebar to view the full thread.</p>
                 </div>
               )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="search" className="flex-1 h-full mt-0 flex flex-col">
           <Card className="flex-1 flex flex-col overflow-hidden border-border shadow-sm">
             <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                <div className="relative w-full max-w-sm">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input 
                     placeholder="Filter semantic searches..." 
                     className="pl-9 bg-background"
                     value={searchSearchQuery}
                     onChange={(e) => setSearchSearchQuery(e.target.value)}
                   />
                 </div>
             </div>
             <div className="flex-1 overflow-auto bg-card">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 shadow-sm border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-medium">Session / Guest ID</th>
                      <th className="px-6 py-4 font-medium">Semantic Query</th>
                      <th className="px-6 py-4 font-medium">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSearchHistory.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                           No search history found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredSearchHistory.map((search) => (
                        <tr key={search.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                            {search.session_id || 'Anonymous'}
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">
                            {search.query_text}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-2">
                               <Clock className="w-3.5 h-3.5" />
                               {formatTimeSafe(search.created_at)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

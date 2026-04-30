"use client"

import { Bell, HelpCircle, Search, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"

interface AdminHeaderProps {
  title?: string
  onMenuClick?: () => void
}

export function AdminHeader({ title = "RAG Intelligence Admin", onMenuClick }: AdminHeaderProps) {
  const { user } = useAuth()

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h2 className="text-lg font-semibold text-foreground hidden md:block">{title}</h2>
        
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users, logs..."
            className="pl-9 w-64 bg-muted/50 border-border"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
        </Button>

        {/* Help */}
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Avatar */}
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            {user?.email ? getInitials(user.email) : "AD"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}

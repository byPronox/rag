"use client"

import Link from "next/link"
import { Bell, Search, BellOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserMenu } from "@/components/user-menu"

export function DemoHeader() {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-[var(--outline-variant)]/30 flex justify-between items-center w-full px-6 py-3 h-16 sticky top-0 z-50 antialiased">
      {/* Left Section: Logo & Search */}
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-[var(--on-surface)] hover:opacity-80 transition-opacity">
          RAG Intelligence
        </Link>
        
        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-full px-3 py-1.5 w-64 hover:border-[var(--outline)] transition-colors duration-200">
          <Search className="text-[var(--on-surface-variant)] w-4 h-4 mr-2" />
          <Input 
            className="bg-transparent border-none outline-none text-sm text-[var(--on-surface)] w-full p-0 placeholder:text-[var(--on-surface-variant)] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto" 
            placeholder="Search resources..." 
            type="text"
          />
        </div>
      </div>
      
      {/* Right Section: Trailing Icons */}
      <div className="flex items-center gap-2 text-primary">
        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:text-primary/80 transition-colors duration-200 rounded-full hover:bg-[var(--surface-container)]"
            >
              <Bell className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-72 p-4 bg-white border border-[var(--outline-variant)]/30 shadow-lg rounded-xl"
          >
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-container-low)] flex items-center justify-center mb-3">
                <BellOff className="w-5 h-5 text-[var(--on-surface-variant)]" />
              </div>
              <p className="text-sm font-medium text-[var(--on-surface)]">
                No notifications yet
              </p>
              <p className="text-xs text-[var(--on-surface-variant)] mt-1">
                We&apos;ll notify you when something arrives
              </p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* AQUÍ REEMPLAZAMOS EL BOTÓN ESTÁTICO POR TU COMPONENTE DINÁMICO */}
        <UserMenu />
        
      </div>
    </header>
  )
}
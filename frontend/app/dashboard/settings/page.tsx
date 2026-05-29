"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { updateUserPassword, logoutAllDevices, regenerateUserApiKey } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Settings, Key, ShieldAlert, LogOut, RefreshCw, Eye, EyeOff, Copy, Check } from "lucide-react"

export default function UserSettingsPage() {
  const { user, login } = useAuth()
  
  // Tabs state
  const [activeTab, setActiveTab] = useState("security")
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" })

  // Logout All State
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false)

  // API Key State
  const [showApiKey, setShowApiKey] = useState(false)
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false)
  const [copied, setCopied] = useState(false)

  // -----------------------------------------------------
  // Security Handlers
  // -----------------------------------------------------
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage({ type: "", text: "" })

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters." })
      return
    }

    setIsUpdatingPassword(true)
    try {
      await updateUserPassword({
        current_password: currentPassword,
        new_password: newPassword
      })
      setPasswordMessage({ type: "success", text: "Password updated successfully!" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      setPasswordMessage({ type: "error", text: error.message || "Failed to update password." })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleLogoutAll = async () => {
    if (!window.confirm("Are you sure you want to log out from ALL devices? You will be logged out of this device as well.")) {
      return
    }

    setIsLoggingOutAll(true)
    try {
      await logoutAllDevices()
      // Force a page reload which will trigger auth-context to see the session is dead
      window.location.href = "/login" 
    } catch (error) {
      console.error("Failed to log out of all devices", error)
      alert("Failed to log out of all devices. Please try again.")
      setIsLoggingOutAll(false)
    }
  }

  // -----------------------------------------------------
  // API Key Handlers
  // -----------------------------------------------------
  const handleRegenerateApiKey = async () => {
    if (!window.confirm("WARNING: Regenerating your API key will immediately break any existing integrations using the old key. Proceed?")) {
      return
    }

    setIsRegeneratingKey(true)
    try {
      const res = await regenerateUserApiKey()
      // Update local context user with new key to avoid needing a refresh
      if (user) {
        login({ ...user, api_key: res.api_key })
      }
      alert("API Key regenerated successfully!")
    } catch (error) {
      console.error("Failed to regenerate API key", error)
      alert("Failed to regenerate API key.")
    } finally {
      setIsRegeneratingKey(false)
    }
  }

  const handleCopyKey = () => {
    if (user?.api_key) {
      navigator.clipboard.writeText(user.api_key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your security preferences and API access.
        </p>
      </div>

      <Tabs defaultValue="security" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="security" className="gap-2">
            <ShieldAlert className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="gap-2">
            <Key className="w-4 h-4" /> API Key
          </TabsTrigger>
        </TabsList>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Update Password</CardTitle>
              <CardDescription>
                Ensure your account is using a long, random password to stay secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current">Current Password</Label>
                  <Input 
                    id="current" 
                    type="password" 
                    required 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">New Password</Label>
                  <Input 
                    id="new" 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <Input 
                    id="confirm" 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                
                {passwordMessage.text && (
                  <div className={`text-sm font-medium p-2 rounded border ${passwordMessage.type === 'error' ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-green-500 bg-green-500/10 border-green-500/20'}`}>
                    {passwordMessage.text}
                  </div>
                )}

                <Button type="submit" disabled={isUpdatingPassword} className="w-full sm:w-auto">
                  {isUpdatingPassword ? <Spinner className="w-4 h-4 mr-2" /> : null}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <LogOut className="w-5 h-5" /> Active Sessions
              </CardTitle>
              <CardDescription>
                If you notice suspicious activity, you can force a logout on all devices. This will invalidate all your current sessions immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                onClick={handleLogoutAll} 
                disabled={isLoggingOutAll}
              >
                {isLoggingOutAll ? <Spinner className="w-4 h-4 mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                Log out of all devices
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API KEYS TAB */}
        <TabsContent value="apikeys" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System API Key</CardTitle>
              <CardDescription>
                Your unique API key is used to authenticate external systems (like your E-commerce store or website) with the RAG backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1 max-w-md">
                    <Input 
                      type={showApiKey ? "text" : "password"} 
                      value={user?.api_key || "No key generated"} 
                      readOnly
                      className="pr-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" onClick={handleCopyKey} className="shrink-0 gap-2">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Keep this key secret. Do not expose it in public client-side code if possible.
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="font-medium mb-2">Regenerate API Key</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  If you suspect your API key has been compromised, you can generate a new one. 
                  <span className="font-semibold text-destructive ml-1">
                    Warning: Old integrations will stop working immediately.
                  </span>
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleRegenerateApiKey}
                  disabled={isRegeneratingKey}
                  className="gap-2"
                >
                  {isRegeneratingKey ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  Regenerate Key
                </Button>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}

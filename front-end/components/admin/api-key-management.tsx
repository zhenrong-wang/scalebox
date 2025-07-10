"use client"

import { useState, useEffect } from "react"
import { Plus, Copy, Eye, EyeOff, Trash2, Search, Filter, AlertTriangle, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DeleteConfirmationDialog } from "../delete-confirmation-dialog"
import { useLanguage } from "../../contexts/language-context"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiKeyService } from "../../services/api-key-service"
import type { ApiKey } from "../../services/api-key-service"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function AdminApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{ total_keys: number; active_keys: number; expired_keys: number; usage_last_30_days: number } | null>(null)

  // Admin action confirmation state
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    keyId: string
    keyName: string
    userEmail: string
    action: "disable" | "delete"
    reason: string
    isLoading: boolean
  }>({
    isOpen: false,
    keyId: "",
    keyName: "",
    userEmail: "",
    action: "disable",
    reason: "",
    isLoading: false,
  })

  const { t } = useLanguage()

  useEffect(() => {
    fetchApiKeys()
    fetchStats()
  }, [])

  const fetchApiKeys = async () => {
    setLoading(true)
    setError("")
    try {
      const keys = await ApiKeyService.getAllApiKeys()
      setApiKeys(keys)
    } catch (e: any) {
      setError(e.message || "Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const statsData = await ApiKeyService.getApiKeyStats()
      setStats(statsData)
    } catch (e: any) {
      console.error("Failed to load stats:", e)
    }
  }

  const openActionDialog = (keyId: string, keyName: string, userEmail: string, action: "disable" | "delete") => {
    setActionDialog({
      isOpen: true,
      keyId,
      keyName,
      userEmail,
      action,
      reason: "",
      isLoading: false,
    })
  }

  const closeActionDialog = () => {
    setActionDialog({
      isOpen: false,
      keyId: "",
      keyName: "",
      userEmail: "",
      action: "disable",
      reason: "",
      isLoading: false,
    })
  }

  const confirmAction = async () => {
    setActionDialog((prev) => ({ ...prev, isLoading: true }))
    setError("")
    setSuccess("")
    
    try {
      await ApiKeyService.adminApiKeyAction(actionDialog.keyId, actionDialog.action, actionDialog.reason || undefined)
      
      if (actionDialog.action === "delete") {
        setApiKeys((prev) => prev.filter((key) => key.key_id !== actionDialog.keyId))
      } else {
        // Update the key status in the list
        setApiKeys((prev) => prev.map((key) => 
          key.key_id === actionDialog.keyId 
            ? { ...key, is_active: false }
            : key
        ))
      }
      
      setSuccess(`API key "${actionDialog.keyName}" has been ${actionDialog.action}. A notification email has been sent to ${actionDialog.userEmail}.`)
      closeActionDialog()
    } catch (e: any) {
      setError(e.message || `Failed to ${actionDialog.action} API key`)
    }
  }

  const filteredApiKeys = apiKeys.filter((apiKey) => {
    const matchesSearch = apiKey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (apiKey.user_email && apiKey.user_email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || (apiKey.is_active ? "active" : "disabled") === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeKeys = apiKeys.filter((key) => key.is_active).length
  const totalKeys = apiKeys.length

  return (
    <div className="space-y-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{totalKeys}</div>
          <div className="text-sm text-muted-foreground">Total Keys</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600">{activeKeys}</div>
          <div className="text-sm text-muted-foreground">Active Keys</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{totalKeys - activeKeys}</div>
          <div className="text-sm text-muted-foreground">Disabled Keys</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-blue-600">{stats?.usage_last_30_days || 0}</div>
          <div className="text-sm text-muted-foreground">API Calls (30d)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by key name or user email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin API Key Management
          </CardTitle>
          <CardDescription>
            View and manage all API keys across the platform. You can disable or delete keys, and users will be notified via email.
          </CardDescription>
        </CardHeader>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApiKeys.map((key) => (
                <TableRow key={key.key_id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>{key.user_email || "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant={key.is_active ? "default" : "destructive"}>
                      {key.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>{ApiKeyService.getPermissionsText(key.permissions)}</TableCell>
                  <TableCell>{key.created_at ? new Date(key.created_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}</TableCell>
                  <TableCell className="flex gap-2">
                    {key.is_active && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openActionDialog(key.key_id, key.name, key.user_email || "", "disable")}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          Disable
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openActionDialog(key.key_id, key.name, key.user_email || "", "delete")}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </>
                    )}
                    {!key.is_active && (
                      <span className="text-muted-foreground text-sm">No actions available</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredApiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {loading ? "Loading..." : "No API keys found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Admin Action Confirmation Dialog */}
      <Dialog open={actionDialog.isOpen} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              {actionDialog.action === "disable" ? "Disable API Key" : "Delete API Key"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">
                    {actionDialog.action === "disable" 
                      ? "This will disable the API key and prevent any further API access."
                      : "This will permanently delete the API key. This action cannot be undone."
                    }
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    A notification email will be sent to <strong>{actionDialog.userEmail}</strong> informing them of this action.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={actionDialog.reason}
                onChange={(e) => setActionDialog(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter a reason for this action..."
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeActionDialog}>
                Cancel
              </Button>
              <Button 
                variant={actionDialog.action === "delete" ? "destructive" : "default"}
                onClick={confirmAction}
                disabled={actionDialog.isLoading}
              >
                {actionDialog.isLoading ? "Processing..." : actionDialog.action === "disable" ? "Disable Key" : "Delete Key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
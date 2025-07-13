"use client"

import { useState, useEffect } from "react"
import { Trash2, Search, AlertTriangle, Shield, Power, PowerOff, X } from "lucide-react"
import { SortIndicator } from "@/components/ui/sort-indicator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResizableTable, ResizableTableHead, ResizableTableCell } from "@/components/ui/resizable-table"
import { CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  const [sortBy, setSortBy] = useState<string>("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [ownerFilter, setOwnerFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from: string | null, to: string | null }>({ from: null, to: null })

  // Admin action confirmation state
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    keyId: string
    keyName: string
    userEmail: string
    action: "enable" | "disable" | "delete"
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
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const statsData = await ApiKeyService.getApiKeyStats()
      setStats(statsData)
    } catch (e: unknown) {
      console.error("Failed to load stats:", e)
    }
  }

  const openActionDialog = (keyId: string, keyName: string, userEmail: string, action: "enable" | "disable" | "delete") => {
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
            ? { ...key, is_active: actionDialog.action === "enable" }
            : key
        ))
      }
      
      const actionText = actionDialog.action === "enable" ? "enabled" : actionDialog.action === "disable" ? "disabled" : "deleted"
      setSuccess(`API key "${actionDialog.keyName}" has been ${actionText}. A notification email has been sent to ${actionDialog.userEmail}.`)
      closeActionDialog()
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || `Failed to ${actionDialog.action} API key`)
    }
  }

  // Get unique owners for filter dropdown
  const owners = Array.from(new Set(apiKeys.map(k => k.user_email).filter(Boolean)))

  // Sorting logic
  const sortedApiKeys = [...apiKeys].sort((a, b) => {
    let aVal = a[sortBy as keyof ApiKey]
    let bVal = b[sortBy as keyof ApiKey]
    // Handle undefined
    if (typeof aVal === 'undefined' || aVal === null) aVal = ''
    if (typeof bVal === 'undefined' || bVal === null) bVal = ''
    // Handle booleans (e.g., is_active)
    if (typeof aVal === 'boolean') aVal = aVal ? 1 : 0
    if (typeof bVal === 'boolean') bVal = bVal ? 1 : 0
    // Handle objects (e.g., permissions)
    if (typeof aVal === 'object') aVal = ''
    if (typeof bVal === 'object') bVal = ''
    if (sortBy === "created_at") {
      aVal = a.created_at ? new Date(a.created_at).getTime() : 0
      bVal = b.created_at ? new Date(b.created_at).getTime() : 0
    }
    if (sortBy === "name" || sortBy === "user_email") {
      aVal = (aVal || "").toString().toLowerCase()
      bVal = (bVal || "").toString().toLowerCase()
    }
    if (aVal === bVal) return 0
    if (sortOrder === "asc") return aVal > bVal ? 1 : -1
    return aVal < bVal ? 1 : -1
  })

  // Filtering logic
  const filteredApiKeys = sortedApiKeys.filter((apiKey) => {
    const matchesSearch = apiKey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apiKey.user_email && apiKey.user_email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || (apiKey.is_active ? "active" : "disabled") === statusFilter
    const matchesOwner = ownerFilter === "all" || apiKey.user_email === ownerFilter
    let matchesDate = true
    if (dateRange.from) {
      matchesDate = matchesDate && new Date(apiKey.created_at) >= new Date(dateRange.from)
    }
    if (dateRange.to) {
      matchesDate = matchesDate && new Date(apiKey.created_at) <= new Date(dateRange.to)
    }
    return matchesSearch && matchesStatus && matchesOwner && matchesDate
  })

  const activeKeys = apiKeys.filter((key) => key.is_active).length
  const totalKeys = apiKeys.length
  const filteredKeys = filteredApiKeys.length

  return (
    <div className="space-y-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{totalKeys}</div>
          <div className="text-sm text-muted-foreground">{t("table.totalKeys") || "Total Keys"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600">{activeKeys}</div>
          <div className="text-sm text-muted-foreground">{t("table.activeKeys") || "Active Keys"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{totalKeys - activeKeys}</div>
          <div className="text-sm text-muted-foreground">{t("table.disabledKeys") || "Disabled Keys"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-blue-600">{stats?.usage_last_30_days || 0}</div>
          <div className="text-sm text-muted-foreground">{t("table.apiCalls") || "API Calls"} (30d)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("apiKey.search") || "Search by key name or user email..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder={t("table.selectStatus") || "Filter by status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("table.allStatus") || "All Status"}</SelectItem>
              <SelectItem value="active">{t("table.active")}</SelectItem>
              <SelectItem value="disabled">{t("table.disabled")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("table.owner") || "Owner"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("table.owner") || "All Owners"}</SelectItem>
              {owners.filter((owner): owner is string => Boolean(owner)).map(owner => (
                <SelectItem key={owner} value={owner}>{owner}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={`flex items-center gap-2 p-2 rounded-lg border transition-colors h-10 ${
          dateRange.from || dateRange.to 
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' 
            : 'bg-muted/50 border-border'
        }`}>
          <Label className={`text-sm font-medium whitespace-nowrap ${
            dateRange.from || dateRange.to 
              ? 'text-blue-700 dark:text-blue-300' 
              : ''
          }`}>{t("table.created") || "Created"}</Label>
          <div className="flex items-center gap-1">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  // Get the button element that was clicked
                  const button = e.currentTarget
                  const buttonRect = button.getBoundingClientRect()
                  
                  // Create a visible date input positioned relative to the button
                  const input = document.createElement('input')
                  input.type = 'date'
                  input.style.position = 'fixed'
                  input.style.top = `${buttonRect.bottom + 5}px` // 5px below the button
                  input.style.left = `${buttonRect.left}px`
                  input.style.zIndex = '9999'
                  input.style.padding = '8px'
                  input.style.border = '1px solid #d1d5db'
                  input.style.borderRadius = '6px'
                  input.style.fontSize = '14px'
                  input.style.backgroundColor = 'white'
                  input.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                  input.style.minWidth = '140px'
                  
                  document.body.appendChild(input)
                  
                  // Track if the input has been removed
                  let isRemoved = false
                  
                  const removeInput = () => {
                    if (!isRemoved && document.body.contains(input)) {
                      document.body.removeChild(input)
                      isRemoved = true
                      document.removeEventListener('keyup', handleEscape)
                    }
                  }
                  
                  // Focus and show the input
                  input.focus()
                  
                  // Try to show the picker for modern browsers
                  if (input.showPicker) {
                    input.showPicker()
                  }
                  
                  input.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement
                    if (target.value) {
                      setDateRange(r => ({ ...r, from: target.value }))
                    }
                    removeInput()
                  })
                  
                  input.addEventListener('blur', () => {
                    // Remove the input if user clicks away
                    setTimeout(removeInput, 100)
                  })
                  
                  // Also handle escape key - use keyup to catch it after the input processes it
                  const handleEscape = (e: KeyboardEvent) => {
                    if (e.key === 'Escape') {
                      removeInput()
                    }
                  }
                  document.addEventListener('keyup', handleEscape)
                }}
                className="w-[100px] h-8 text-sm justify-start"
              >
                {dateRange.from ? new Date(dateRange.from).toLocaleDateString() : "From"}
              </Button>
            </div>
            <span className="text-muted-foreground text-sm">to</span>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  // Get the button element that was clicked
                  const button = e.currentTarget
                  const buttonRect = button.getBoundingClientRect()
                  
                  // Create a visible date input positioned relative to the button
                  const input = document.createElement('input')
                  input.type = 'date'
                  input.style.position = 'fixed'
                  input.style.top = `${buttonRect.bottom + 5}px` // 5px below the button
                  input.style.left = `${buttonRect.left}px`
                  input.style.zIndex = '9999'
                  input.style.padding = '8px'
                  input.style.border = '1px solid #d1d5db'
                  input.style.borderRadius = '6px'
                  input.style.fontSize = '14px'
                  input.style.backgroundColor = 'white'
                  input.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                  input.style.minWidth = '140px'
                  
                  document.body.appendChild(input)
                  
                  // Track if the input has been removed
                  let isRemoved = false
                  
                  const removeInput = () => {
                    if (!isRemoved && document.body.contains(input)) {
                      document.body.removeChild(input)
                      isRemoved = true
                      document.removeEventListener('keyup', handleEscape)
                    }
                  }
                  
                  // Focus and show the input
                  input.focus()
                  
                  // Try to show the picker for modern browsers
                  if (input.showPicker) {
                    input.showPicker()
                  }
                  
                  input.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement
                    if (target.value) {
                      setDateRange(r => ({ ...r, to: target.value }))
                    }
                    removeInput()
                  })
                  
                  input.addEventListener('blur', () => {
                    // Remove the input if user clicks away
                    setTimeout(removeInput, 100)
                  })
                  
                  // Also handle escape key - use keyup to catch it after the input processes it
                  const handleEscape = (e: KeyboardEvent) => {
                    if (e.key === 'Escape') {
                      removeInput()
                    }
                  }
                  document.addEventListener('keyup', handleEscape)
                }}
                className="w-[100px] h-8 text-sm justify-start"
              >
                {dateRange.to ? new Date(dateRange.to).toLocaleDateString() : "To"}
              </Button>
            </div>
          </div>
          {(dateRange.from || dateRange.to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRange({ from: null, to: null })}
              className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              title="Clear date range"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("nav.apiKeys") || "Admin API Key Management"}
            {(searchTerm || statusFilter !== "all" || ownerFilter !== "all" || dateRange.from || dateRange.to) && (
              <Badge variant="secondary" className="ml-2">
                {filteredKeys} of {totalKeys}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {t("admin.apiKeyManagementDesc") || "View and manage all API keys across the platform. You can disable or delete keys, and users will be notified via email."}
            {(searchTerm || statusFilter !== "all" || ownerFilter !== "all" || dateRange.from || dateRange.to) && (
              <span className="block mt-1 text-sm text-muted-foreground">
                Showing {filteredKeys} of {totalKeys} API keys
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredApiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? "Loading..." : t("table.noKeys") || "No API keys found."}
            </div>
          ) : (
            <ResizableTable
              defaultColumnWidths={{
                name: 150,
                description: 180,
                status: 100,
                expiration: 120,
                permissions: 110,
                keyValue: 150,
                owner: 150,
                created: 120,
                actions: 140
              }}
            >
              <TableHeader>
                <TableRow>
                  <ResizableTableHead 
                    columnId="name" 
                    defaultWidth={150}
                    className="cursor-pointer group"
                    onClick={() => { setSortBy("name"); setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc") }}
                  >
                    <div className="flex items-center gap-1">
                      {t("apiKey.keyName")}
                      <SortIndicator
                        isSorted={sortBy === "name"}
                        sortDirection={sortBy === "name" ? sortOrder : undefined}
                      />
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="description" defaultWidth={180}>{t("table.description")}</ResizableTableHead>
                  <ResizableTableHead 
                    columnId="status" 
                    defaultWidth={100}
                    className="cursor-pointer group"
                    onClick={() => { setSortBy("is_active"); setSortOrder(sortBy === "is_active" && sortOrder === "asc" ? "desc" : "asc") }}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.status")}
                      <SortIndicator
                        isSorted={sortBy === "is_active"}
                        sortDirection={sortBy === "is_active" ? sortOrder : undefined}
                      />
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="expiration" defaultWidth={120}>{t("apiKey.expiration")}</ResizableTableHead>
                  <ResizableTableHead columnId="permissions" defaultWidth={110}>{t("table.permissions") || "Permissions"}</ResizableTableHead>
                  <ResizableTableHead columnId="keyValue" defaultWidth={150}>{t("apiKey.keyValue")}</ResizableTableHead>
                  <ResizableTableHead 
                    columnId="owner" 
                    defaultWidth={150}
                    className="cursor-pointer group"
                    onClick={() => { setSortBy("user_email"); setSortOrder(sortBy === "user_email" && sortOrder === "asc" ? "desc" : "asc") }}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.owner")}
                      <SortIndicator
                        isSorted={sortBy === "user_email"}
                        sortDirection={sortBy === "user_email" ? sortOrder : undefined}
                      />
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="created" 
                    defaultWidth={120}
                    className="cursor-pointer group"
                    onClick={() => { setSortBy("created_at"); setSortOrder(sortBy === "created_at" && sortOrder === "asc" ? "desc" : "asc") }}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.created")}
                      <SortIndicator
                        isSorted={sortBy === "created_at"}
                        sortDirection={sortBy === "created_at" ? sortOrder : undefined}
                      />
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="actions" defaultWidth={140}>{t("table.actions")}</ResizableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApiKeys.map((key) => (
                  <TableRow key={key.key_id}>
                    <ResizableTableCell>{key.name}</ResizableTableCell>
                    <ResizableTableCell className="break-words">{key.description || "-"}</ResizableTableCell>
                    <ResizableTableCell>
                      <Badge variant={key.is_active ? "default" : "destructive"}>
                        {key.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      {key.expires_in_days ? ApiKeyService.getExpirationText(key.expires_in_days, key.created_at, t) : (t("apiKey.permanent") || "Permanent")}
                    </ResizableTableCell>
                    <ResizableTableCell className="break-words">{ApiKeyService.getPermissionsText(key.permissions, t)}</ResizableTableCell>
                    <ResizableTableCell>
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {key.prefix}...
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("apiKey.adminViewNote") || "Full key not available in admin view"}
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>{key.user_email || "-"}</ResizableTableCell>
                    <ResizableTableCell>{key.created_at ? new Date(key.created_at).toLocaleDateString() : "-"}</ResizableTableCell>
                    <ResizableTableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm"
                          variant="outline" 
                          onClick={() => openActionDialog(key.key_id, key.name, key.user_email || "", key.is_active ? "disable" : "enable")} 
                          title={key.is_active ? (t("action.disable") || "Disable") : (t("action.enable") || "Enable")}
                          className="h-8 w-8 p-0"
                        >
                          {key.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline" 
                          onClick={() => openActionDialog(key.key_id, key.name, key.user_email || "", "delete")} 
                          title={t("apiKey.deleteKey") || "Delete API Key"}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </ResizableTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>
          )}
        </CardContent>
      </Card>

      {/* Admin Action Confirmation Dialog */}
      <Dialog open={actionDialog.isOpen} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              {actionDialog.action === "enable" 
                ? t("action.enable") + " " + t("table.apiKey")
                : actionDialog.action === "disable" 
                ? t("action.disable") + " " + t("table.apiKey")
                : t("action.delete") + " " + t("table.apiKey")
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">
                    {actionDialog.action === "enable" 
                      ? t("admin.enableApiKeyWarning") || "This will enable the API key and allow API access."
                      : actionDialog.action === "disable"
                      ? t("admin.disableApiKeyWarning") || "This will disable the API key and prevent any further API access."
                      : t("admin.deleteApiKeyWarning") || "This will permanently delete the API key. This action cannot be undone."
                    }
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    {t("admin.notificationEmailSent") || "A notification email will be sent to"} <strong>{actionDialog.userEmail}</strong> {t("admin.informingAction") || "informing them of this action."}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="reason">{t("admin.reason") || "Reason"} ({t("admin.optional") || "optional"})</Label>
              <Input
                id="reason"
                value={actionDialog.reason}
                onChange={(e) => setActionDialog(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={t("admin.enterReason") || "Enter a reason for this action..."}
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeActionDialog}>
                {t("action.cancel")}
              </Button>
              <Button 
                variant={actionDialog.action === "delete" ? "destructive" : "default"}
                onClick={confirmAction}
                disabled={actionDialog.isLoading}
              >
                {actionDialog.isLoading 
                  ? t("admin.processing") || "Processing..." 
                  : actionDialog.action === "enable" 
                  ? t("action.enable") + " " + t("table.apiKey")
                  : actionDialog.action === "disable" 
                  ? t("action.disable") + " " + t("table.apiKey")
                  : t("action.delete") + " " + t("table.apiKey")
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
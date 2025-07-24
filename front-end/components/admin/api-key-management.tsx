"use client"

import { useState, useEffect } from "react"
import { Trash2, Search, AlertTriangle, Shield, Power, PowerOff, X, ChevronDown, ChevronRight, Users, Building2, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useLanguage } from "../../contexts/language-context"
import { ApiKeyService } from "../../services/api-key-service"
import type { ApiKey } from "../../services/api-key-service"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CopyButton } from "@/components/ui/copy-button"
import { EditableDescription } from "@/components/ui/editable-description"
import { EditableName } from "@/components/ui/editable-name"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface AccountNode {
  account_id: string
  account_name: string
  account_email: string
  is_active: boolean
  users: UserNode[]
  total_api_keys: number
  active_api_keys: number
  disabled_api_keys: number
}

interface UserNode {
  user_id: string
  username: string
  email: string
  role: string
  is_active: boolean
  api_keys: ApiKey[]
  total_api_keys: number
  active_api_keys: number
  disabled_api_keys: number
}

interface TreeData {
  accounts: AccountNode[]
  total_accounts: number
  total_users: number
  total_api_keys: number
  active_api_keys: number
  disabled_api_keys: number
}

export function AdminApiKeyManagement() {
  const [treeData, setTreeData] = useState<TreeData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

  // Action confirmation state
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    targetType: "account" | "user" | "api_key"
    targetId: string
    targetName: string
    action: "disable" | "enable" | "delete"
    reason: string
    isLoading: boolean
    affectedCount: number
  }>({
    isOpen: false,
    targetType: "api_key",
    targetId: "",
    targetName: "",
    action: "disable",
    reason: "",
    isLoading: false,
    affectedCount: 0,
  })

  const { t } = useLanguage()

  useEffect(() => {
    fetchTreeData()
  }, [])

  const fetchTreeData = async () => {
    setLoading(true)
    setError("")
    try {
      const apiKeys = await ApiKeyService.getAllApiKeys()
      
      // Group API keys by user and account
      const accountMap = new Map<string, AccountNode>()
      
      for (const apiKey of apiKeys) {
        // Extract user and account info from API key
        const userEmail = apiKey.user_email || "Unknown"
        const accountEmail = userEmail.split('@')[1] || "Unknown"
        const accountId = accountEmail // Using domain as account ID for now
        
        // Get or create account
        if (!accountMap.has(accountId)) {
          accountMap.set(accountId, {
            account_id: accountId,
            account_name: accountEmail,
            account_email: accountEmail,
            is_active: true,
            users: [],
            total_api_keys: 0,
            active_api_keys: 0,
            disabled_api_keys: 0,
          })
        }
        
        const account = accountMap.get(accountId)!
        
        // Get or create user
        let user = account.users.find(u => u.email === userEmail)
        if (!user) {
          user = {
            user_id: apiKey.user_email || "unknown",
            username: userEmail.split('@')[0] || "Unknown",
            email: userEmail,
            role: "user",
            is_active: true,
            api_keys: [],
            total_api_keys: 0,
            active_api_keys: 0,
            disabled_api_keys: 0,
          }
          account.users.push(user)
        }
        
        // Add API key to user
        user.api_keys.push(apiKey)
        user.total_api_keys++
        if (apiKey.is_active) {
          user.active_api_keys++
        } else {
          user.disabled_api_keys++
        }
        
        // Update account totals
        account.total_api_keys++
        if (apiKey.is_active) {
          account.active_api_keys++
        } else {
          account.disabled_api_keys++
        }
      }
      
      const accounts = Array.from(accountMap.values())
      const totalAccounts = accounts.length
      const totalUsers = accounts.reduce((sum, acc) => sum + acc.users.length, 0)
      const totalApiKeys = accounts.reduce((sum, acc) => sum + acc.total_api_keys, 0)
      const activeApiKeys = accounts.reduce((sum, acc) => sum + acc.active_api_keys, 0)
      const disabledApiKeys = accounts.reduce((sum, acc) => sum + acc.disabled_api_keys, 0)
      
      setTreeData({
        accounts,
        total_accounts: totalAccounts,
        total_users: totalUsers,
        total_api_keys: totalApiKeys,
        active_api_keys: activeApiKeys,
        disabled_api_keys: disabledApiKeys,
      })
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to load API key tree data")
    } finally {
      setLoading(false)
    }
  }

  const toggleAccountExpansion = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedUsers(newExpanded)
  }

  const openActionDialog = (
    targetType: "account" | "user" | "api_key",
    targetId: string,
    targetName: string,
    action: "disable" | "enable" | "delete",
    affectedCount: number = 1
  ) => {
    setActionDialog({
      isOpen: true,
      targetType,
      targetId,
      targetName,
      action,
      reason: "",
      isLoading: false,
      affectedCount,
    })
  }

  const closeActionDialog = () => {
    setActionDialog(prev => ({ ...prev, isOpen: false }))
  }

  const confirmAction = async () => {
    setActionDialog(prev => ({ ...prev, isLoading: true }))
    setError("")
    
    try {
      const { targetType, targetId, targetName, action, reason } = actionDialog
      
      let message = ""
      
             switch (targetType) {
         case "account":
           // Disable/enable all API keys for all users in the account
           if (action === "disable") {
             const result = await ApiKeyService.adminAccountAPIKeyAction(targetId, "disable", reason)
             message = result.message
           } else if (action === "enable") {
             const result = await ApiKeyService.adminAccountAPIKeyAction(targetId, "enable", reason)
             message = result.message
           }
           break
           
         case "user":
           // Disable/enable all API keys for the user
           if (action === "disable") {
             const result = await ApiKeyService.adminUserAPIKeyAction(targetId, "disable", reason)
             message = result.message
           } else if (action === "enable") {
             const result = await ApiKeyService.adminUserAPIKeyAction(targetId, "enable", reason)
             message = result.message
           }
           break
          
        case "api_key":
          // Individual API key action
          if (action === "delete") {
            await ApiKeyService.adminApiKeyAction(targetId, "delete", reason)
            message = `Deleted API key ${targetName}`
          } else if (action === "disable") {
            await ApiKeyService.adminApiKeyAction(targetId, "disable", reason)
            message = `Disabled API key ${targetName}`
          } else if (action === "enable") {
            await ApiKeyService.adminApiKeyAction(targetId, "enable", reason)
            message = `Enabled API key ${targetName}`
          }
          break
      }
      
      setSuccess(message)
      setTimeout(() => setSuccess(""), 3000)
      
      // Refresh data
      await fetchTreeData()
      
      // TODO: Send notification to stakeholders
      // await NotificationService.sendNotification({
      //   type: "api_key_action",
      //   title: `API Key ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      //   message: `${message}. Reason: ${reason || "No reason provided"}`,
      //   recipients: ["admin@scalebox.com", targetEmail],
      // })
      
    } catch (e: unknown) {
      const error = e as Error
      setError(error.message || "Failed to perform action")
    } finally {
      setActionDialog(prev => ({ ...prev, isLoading: false }))
      closeActionDialog()
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "destructive"}>
        {isActive ? "Active" : "Disabled"}
      </Badge>
    )
  }

  const filteredTreeData = treeData ? {
    ...treeData,
    accounts: treeData.accounts.filter(account => {
      const matchesSearch = 
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.users.some(user => 
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.api_keys.some(key => key.name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && account.active_api_keys > 0) ||
        (statusFilter === "disabled" && account.disabled_api_keys > 0)
      
      return matchesSearch && matchesStatus
    })
  } : null

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading API key tree...</p>
        </div>
      </div>
    )
  }

  if (!treeData) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load API key data</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{treeData.total_accounts}</div>
            <div className="text-sm text-muted-foreground">Accounts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{treeData.total_users}</div>
            <div className="text-sm text-muted-foreground">Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{treeData.total_api_keys}</div>
            <div className="text-sm text-muted-foreground">Total API Keys</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{treeData.active_api_keys}</div>
            <div className="text-sm text-muted-foreground">Active Keys</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{treeData.disabled_api_keys}</div>
            <div className="text-sm text-muted-foreground">Disabled Keys</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search accounts, users, or API keys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-[140px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tree Structure */}
      <div className="space-y-4">
        {filteredTreeData?.accounts.map((account) => (
          <Card key={account.account_id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CollapsibleTrigger
                    asChild
                    onClick={() => toggleAccountExpansion(account.account_id)}
                  >
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      {expandedAccounts.has(account.account_id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{account.account_name}</div>
                    <div className="text-sm text-muted-foreground">{account.account_email}</div>
                  </div>
                  {getStatusBadge(account.is_active)}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{account.total_api_keys} keys</div>
                    <div className="text-xs text-muted-foreground">
                      {account.active_api_keys} active, {account.disabled_api_keys} disabled
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openActionDialog(
                        "account",
                        account.account_id,
                        account.account_name,
                        account.is_active ? "disable" : "enable",
                        account.total_api_keys
                      )}
                    >
                      {account.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <Collapsible open={expandedAccounts.has(account.account_id)}>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {account.users.map((user) => (
                      <div key={user.user_id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <CollapsibleTrigger
                              asChild
                              onClick={() => toggleUserExpansion(user.user_id)}
                            >
                              <Button variant="ghost" size="sm" className="p-0 h-auto">
                                {expandedUsers.has(user.user_id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{user.username}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                            {getStatusBadge(user.is_active)}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-medium">{user.total_api_keys} keys</div>
                              <div className="text-xs text-muted-foreground">
                                {user.active_api_keys} active, {user.disabled_api_keys} disabled
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openActionDialog(
                                  "user",
                                  user.user_id,
                                  user.username,
                                  user.is_active ? "disable" : "enable",
                                  user.total_api_keys
                                )}
                              >
                                {user.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <Collapsible open={expandedUsers.has(user.user_id)}>
                          <CollapsibleContent>
                            <div className="space-y-2">
                              {user.api_keys.map((apiKey) => (
                                <div key={apiKey.key_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Key className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium">{apiKey.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {apiKey.description || "No description"}
                                      </div>
                                    </div>
                                    {getStatusBadge(apiKey.is_active)}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-xs text-muted-foreground">
                                      Created: {new Date(apiKey.created_at).toLocaleDateString()}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openActionDialog(
                                        "api_key",
                                        apiKey.key_id,
                                        apiKey.name,
                                        apiKey.is_active ? "disable" : "enable",
                                        1
                                      )}
                                    >
                                      {apiKey.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openActionDialog(
                                        "api_key",
                                        apiKey.key_id,
                                        apiKey.name,
                                        "delete",
                                        1
                                      )}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.isOpen} onOpenChange={closeActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action.charAt(0).toUpperCase() + actionDialog.action.slice(1)} {actionDialog.targetType}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionDialog.action} {actionDialog.targetName}?
              {actionDialog.affectedCount > 1 && (
                <span className="block mt-2 text-red-600">
                  This will affect {actionDialog.affectedCount} API keys.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Provide a reason for this action..."
                value={actionDialog.reason}
                onChange={(e) => setActionDialog(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeActionDialog} disabled={actionDialog.isLoading}>
                Cancel
              </Button>
              <Button 
                variant={actionDialog.action === "delete" ? "destructive" : "default"}
                onClick={confirmAction}
                disabled={actionDialog.isLoading}
              >
                {actionDialog.isLoading ? "Processing..." : actionDialog.action.charAt(0).toUpperCase() + actionDialog.action.slice(1)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
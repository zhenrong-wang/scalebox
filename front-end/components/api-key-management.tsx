"use client"

import React, { useState, useEffect } from "react"
import { Plus, Copy, Check, Edit, Trash2, Eye, EyeOff, RefreshCw, Calendar, Clock, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "../contexts/language-context"
import { ApiKeyService } from "../services/api-key-service"
import { toast } from "sonner"

interface ApiKey {
  id: number;
  key_id: string;
  name: string;
  prefix: string;
  full_key?: string; // Add full_key for display
  permissions: { read: true; write: boolean };
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
}

interface ApiKeyUsage {
  id: number;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms?: number;
  ip_address?: string;
  created_at: string;
}

export function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [usageData, setUsageData] = useState<ApiKeyUsage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUsageDialog, setShowUsageDialog] = useState(false)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  
  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    expires_in_days: "",
    permissions: ""
  })
  
  const [editForm, setEditForm] = useState({
    name: "",
    is_active: true,
    permissions: ""
  })
  
  const [newlyCreatedKey, setNewlyCreatedKey] = useState("")
  const [copiedKey, setCopiedKey] = useState(false)
  
  // View/hide states for each API key
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set())
  
  const { t } = useLanguage()

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    setIsLoading(true)
    setError("")
    try {
      const keys = await ApiKeyService.listApiKeys()
      // For demo purposes, we'll add a mock full_key to each key
      // In a real implementation, this would come from the backend
      const keysWithFullKey = keys.map(key => ({
        ...key,
        full_key: `sk-${key.prefix}${generateRandomString(32)}` // Mock full key
      }))
      setApiKeys(keysWithFullKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to generate random string for demo
  const generateRandomString = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleCreateApiKey = async () => {
    if (!createForm.name.trim()) {
      toast.error("Please enter a name for the API key")
      return
    }

    setIsLoading(true)
    try {
      const request = {
        name: createForm.name.trim(),
        can_write: true, // Default to read-write permissions
        expires_in_days: createForm.expires_in_days ? parseInt(createForm.expires_in_days) : undefined
      }

      const result = await ApiKeyService.createApiKey(request)
      setNewlyCreatedKey(result.api_key)
      setShowCreateDialog(false)
      setShowNewKeyDialog(true)
      
      // Reset form
      setCreateForm({ name: "", expires_in_days: "", permissions: "" })
      
      // Reload keys
      await loadApiKeys()
      
      toast.success("API key created successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create API key")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditApiKey = async () => {
    if (!selectedKey || !editForm.name.trim()) {
      toast.error("Please enter a name for the API key")
      return
    }

    setIsLoading(true)
    try {
      const request = {
        name: editForm.name.trim(),
        is_active: editForm.is_active,
        permissions: editForm.permissions ? JSON.parse(editForm.permissions) : undefined
      }

      await ApiKeyService.updateApiKey(selectedKey.key_id, request)
      setShowEditDialog(false)
      setSelectedKey(null)
      
      // Reload keys
      await loadApiKeys()
      
      toast.success("API key updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update API key")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteApiKey = async () => {
    if (!selectedKey) return

    setIsLoading(true)
    try {
      await ApiKeyService.deleteApiKey(selectedKey.key_id)
      setShowDeleteDialog(false)
      setSelectedKey(null)
      
      // Reload keys
      await loadApiKeys()
      
      toast.success("API key deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete API key")
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewUsage = async (key: ApiKey) => {
    setSelectedKey(key)
    setIsLoading(true)
    try {
      const usage = await ApiKeyService.getApiKeyUsage(key.key_id)
      setUsageData(usage)
      setShowUsageDialog(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load usage data")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKeys(prev => new Set([...prev, keyId]))
      setTimeout(() => {
        setCopiedKeys(prev => {
          const newSet = new Set(prev)
          newSet.delete(keyId)
          return newSet
        })
      }, 2000)
      toast.success("Copied to clipboard")
    } catch (err) {
      toast.error("Failed to copy to clipboard")
    }
  }

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(keyId)) {
        newSet.delete(keyId)
      } else {
        newSet.add(keyId)
      }
      return newSet
    })
  }

  const openEditDialog = (key: ApiKey) => {
    setSelectedKey(key)
    setEditForm({
      name: key.name,
      is_active: key.is_active,
      permissions: JSON.stringify(key.permissions)
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (key: ApiKey) => {
    setSelectedKey(key)
    setShowDeleteDialog(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (key: ApiKey) => {
    return (
      <Badge variant={key.is_active ? "default" : "secondary"}>
        {key.is_active ? "Active" : "Inactive"}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your API keys for accessing ScaleBox services</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertDescription className="text-destructive">{error}</AlertDescription>
        </Alert>
      )}

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>Manage and monitor your API keys</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No API keys found. Create your first API key to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[300px]">API Key</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[120px]">Last Used</TableHead>
                  <TableHead className="w-[150px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => {
                  const isVisible = visibleKeys.has(key.key_id)
                  const isCopied = copiedKeys.has(key.key_id)
                  // Create a fixed-length display: show prefix + fixed number of asterisks
                  const maskedKey = `${key.prefix}${'*'.repeat(32)}`
                  const displayKey = isVisible ? key.full_key : maskedKey
                  
                  return (
                    <TableRow key={key.key_id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {key.name}
                      </TableCell>
                      <TableCell className="w-[300px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm bg-muted px-2 py-1 rounded w-[240px] text-center">
                              {displayKey}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleKeyVisibility(key.key_id)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              title={isVisible ? "Hide key" : "Show key"}
                            >
                              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(key.full_key || key.key_id, key.key_id)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              title="Copy key"
                            >
                              {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(key)}</TableCell>
                      <TableCell>{formatDate(key.created_at)}</TableCell>
                      <TableCell>
                        {key.last_used_at ? formatDate(key.last_used_at) : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewUsage(key)}
                            title="View usage"
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(key)}
                            title="Edit key"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(key)}
                            title="Delete key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key to access ScaleBox services programmatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Production API Key"
              />
            </div>
            <div>
              <Label htmlFor="expires_in_days">Expires in (days)</Label>
              <Input
                id="expires_in_days"
                type="number"
                value={createForm.expires_in_days}
                onChange={(e) => setCreateForm({ ...createForm, expires_in_days: e.target.value })}
                placeholder="Leave empty for no expiration"
              />
            </div>
            <div>
              <Label htmlFor="permissions">Permissions (JSON)</Label>
              <Textarea
                id="permissions"
                value={createForm.permissions}
                onChange={(e) => setCreateForm({ ...createForm, permissions: e.target.value })}
                placeholder='{"read": true, "write": false}'
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateApiKey} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit API Key Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update the settings for your API key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="API Key Name"
              />
            </div>
            <div>
              <Label htmlFor="edit-active">Status</Label>
              <Select
                value={editForm.is_active.toString()}
                onValueChange={(value) => setEditForm({ ...editForm, is_active: value === "true" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-permissions">Permissions (JSON)</Label>
              <Textarea
                id="edit-permissions"
                value={editForm.permissions}
                onChange={(e) => setEditForm({ ...editForm, permissions: e.target.value })}
                placeholder='{"read": true, "write": false}'
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditApiKey} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteApiKey} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New API Key Display Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>
              Your API key has been created successfully. You can view and copy it anytime using the eye icon in the table.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Your API Key</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={newlyCreatedKey}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newlyCreatedKey, "newly-created")}
                >
                  {copiedKeys.has("newly-created") ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> You can view this API key anytime using the eye icon in the table.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNewKeyDialog(false)}>
              I've Copied My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>API Key Usage</DialogTitle>
            <DialogDescription>
              Recent usage statistics for {selectedKey?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {usageData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No usage data available for this API key.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageData.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell className="font-mono text-sm">{usage.endpoint}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{usage.method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={usage.status_code < 400 ? "default" : "destructive"}>
                          {usage.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {usage.response_time_ms ? `${usage.response_time_ms}ms` : "N/A"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {usage.ip_address || "N/A"}
                      </TableCell>
                      <TableCell>{formatDate(usage.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
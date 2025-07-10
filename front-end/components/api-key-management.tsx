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
  permissions?: Record<string, any>;
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
  
  const { t } = useLanguage()

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    setIsLoading(true)
    setError("")
    try {
      const keys = await ApiKeyService.listApiKeys()
      setApiKeys(keys)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys")
    } finally {
      setIsLoading(false)
    }
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
        expires_in_days: createForm.expires_in_days ? parseInt(createForm.expires_in_days) : undefined,
        permissions: createForm.permissions ? JSON.parse(createForm.permissions) : undefined
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
      toast.success("Copied to clipboard")
    } catch (err) {
      toast.error("Failed to copy to clipboard")
    }
  }

  const openEditDialog = (key: ApiKey) => {
    setSelectedKey(key)
    setEditForm({
      name: key.name,
      is_active: key.is_active,
      permissions: key.permissions ? JSON.stringify(key.permissions, null, 2) : ""
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (key: ApiKey) => {
    setSelectedKey(key)
    setShowDeleteDialog(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + " " + new Date(dateString).toLocaleTimeString()
  }

  const getStatusBadge = (key: ApiKey) => {
    const status = ApiKeyService.getStatusBadge(key)
    return <Badge variant={status.variant}>{status.text}</Badge>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Key ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.key_id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-sm">{key.key_id}</TableCell>
                    <TableCell>{getStatusBadge(key)}</TableCell>
                    <TableCell>{formatDate(key.created_at)}</TableCell>
                    <TableCell>
                      {key.last_used_at ? formatDate(key.last_used_at) : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUsage(key)}
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(key)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
              Copy your API key now. You won't be able to see it again for security reasons.
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
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                >
                  {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Alert>
              <AlertDescription>
                <strong>Important:</strong> Store this API key securely. You won't be able to view it again.
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
"use client"

import { useState, useEffect } from "react"
import { Plus, Copy, Eye, EyeOff, Trash2, Search, Filter, Power, PowerOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ActionConfirmationDialog } from "./action-confirmation-dialog"
import { useLanguage } from "../contexts/language-context"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiKeyService } from "../services/api-key-service"
import type { ApiKey } from "../services/api-key-service"
import { format, parseISO } from "date-fns"

// Extended interface to include the full API key for display
interface ApiKeyWithFullKey extends ApiKey {
  full_key?: string; // The full API key for display
}

export function ApiKeyPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyWithFullKey[]>([])
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyWrite, setNewKeyWrite] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string>("")
  const [newKeyExpiresIn, setNewKeyExpiresIn] = useState<string>("30"); // default 30 days
  const [newKeyDescription, setNewKeyDescription] = useState("");

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    keyId: string
    keyName: string
    isLoading: boolean
  }>({
    isOpen: false,
    keyId: "",
    keyName: "",
    isLoading: false,
  })

  // Disable confirmation state
  const [disableDialog, setDisableDialog] = useState<{
    isOpen: boolean
    keyId: string
    keyName: string
    isLoading: boolean
  }>({
    isOpen: false,
    keyId: "",
    keyName: "",
    isLoading: false,
  })

  const { t } = useLanguage()

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    setLoading(true)
    setError("")
    try {
      const keys = await ApiKeyService.listApiKeys()
      setApiKeys(keys)
    } catch (e: any) {
      setError(e.message || "Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key)
    setSuccess(t("apiKey.copied") || "Copied!")
    setTimeout(() => setSuccess("") , 1500)
  }

  const toggleKeyStatus = (id: string) => {
    setApiKeys((prev) =>
      prev.map((key) => (key.key_id === id ? { ...key, is_active: !key.is_active } : key)),
    )
  }

  const handleToggleKeyStatus = async (keyId: string) => {
    // Find the key to check if we're enabling or disabling
    const key = apiKeys.find(k => k.key_id === keyId);
    if (!key) return;

    // If we're disabling, show confirmation dialog
    if (key.is_active) {
      setDisableDialog({
        isOpen: true,
        keyId,
        keyName: key.name,
        isLoading: false,
      });
      return;
    }

    // If we're enabling, proceed directly
    setError("");
    setSuccess("");
    try {
      await ApiKeyService.toggleApiKeyStatus(keyId);
      toggleKeyStatus(keyId);
      setSuccess(t("apiKey.statusUpdated") || "API key status updated successfully!");
    } catch (e: any) {
      setError(e.message || "Failed to update API key status");
    }
  }

  const openDeleteDialog = (keyId: string, keyName: string) => {
    // Find the key to check if it's active
    const key = apiKeys.find(k => k.key_id === keyId);
    if (!key) return;

    // Prevent deletion of active keys
    if (key.is_active) {
      setError(t("apiKey.cannotDeleteActive") || "Cannot delete an active API key. Please disable it first.");
      return;
    }

    setDeleteDialog({
      isOpen: true,
      keyId,
      keyName,
      isLoading: false,
    })
  }

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      keyId: "",
      keyName: "",
      isLoading: false,
    })
  }

  const closeDisableDialog = () => {
    setDisableDialog({
      isOpen: false,
      keyId: "",
      keyName: "",
      isLoading: false,
    })
  }

  const confirmDisableKey = async () => {
    setDisableDialog((prev) => ({ ...prev, isLoading: true }))
    setError("")
    setSuccess("")
    try {
      await ApiKeyService.toggleApiKeyStatus(disableDialog.keyId);
      toggleKeyStatus(disableDialog.keyId);
      setSuccess(t("apiKey.statusUpdated") || "API key status updated successfully!");
      closeDisableDialog();
    } catch (e: any) {
      setError(e.message || "Failed to update API key status");
    }
  }

  const confirmDeleteKey = async () => {
    setDeleteDialog((prev) => ({ ...prev, isLoading: true }))
    setError("")
    try {
      await ApiKeyService.deleteApiKey(deleteDialog.keyId)
      setApiKeys((prev) => prev.filter((key) => key.key_id !== deleteDialog.keyId))
      setSuccess(t("action.deleted") || "Deleted!")
    } catch (e: any) {
      setError(e.message || "Failed to delete API key")
    } finally {
      closeDeleteDialog()
    }
  }

  const createNewKey = async () => {
    setDialogError("");
    setSuccess("");
    if (!newKeyName.trim()) return;
    if (apiKeys.length >= 5) {
      setDialogError(t("apiKey.maxKeysReached") || "Maximum of 5 API keys allowed. Delete one to create a new key.");
      return;
    }
    setLoading(true);
    try {
      const expires_in_days = newKeyExpiresIn === "permanent" ? undefined : parseInt(newKeyExpiresIn, 10);
      const res = await ApiKeyService.createApiKey({ name: newKeyName, description: newKeyDescription, can_write: newKeyWrite, expires_in_days });
      
      // Add the new key to the list with the full key for display
      const newKey: ApiKeyWithFullKey = {
        id: 0, // Will be set by the backend
        key_id: res.key_id,
        name: newKeyName,
        description: newKeyDescription,
        prefix: res.prefix,
        permissions: { read: true, write: newKeyWrite },
        is_active: true,
        expires_in_days,
        created_at: new Date().toISOString(),
        full_key: res.api_key // Store the full key for persistent display
      };
      
      setApiKeys(prev => [...prev, newKey]);
      setSuccess("API key created successfully!");
      setIsDialogOpen(false);
      setDialogError("");
      setNewKeyName("");
      setNewKeyWrite(true);
      setNewKeyDescription("");
      setNewKeyExpiresIn("30");
    } catch (e: any) {
      // Check if it's a duplicate name error and use the translated message
      if (e.message && e.message.includes("must be unique")) {
        setDialogError(t("apiKey.duplicateName") || "An API key with this name already exists. Please choose a different name.");
      } else {
        setDialogError(e.message || "Failed to create API key");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredApiKeys = apiKeys.filter((apiKey) => {
    const matchesSearch = apiKey.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || (apiKey.is_active ? "active" : "disabled") === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeKeys = apiKeys.filter((key) => key.is_active).length
  const totalKeys = apiKeys.length

  return (
    <div className="space-y-6">
      {error && <div className="text-red-600 font-medium">{error}</div>}
      {success && <div className="text-green-600 font-medium">{success}</div>}
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setDialogError("");
              setNewKeyName("");
              setNewKeyDescription("");
              setNewKeyExpiresIn("30");
              setNewKeyWrite(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full" disabled={apiKeys.length >= 5}>
                <Plus className="h-4 w-4 mr-2" />
                {t("apiKey.createKey") || "Create Key"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("apiKey.createKey") || "Create API Key"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {dialogError && <div className="text-red-600 text-sm font-medium">{dialogError}</div>}
                <div>
                  <Label htmlFor="keyName">{t("apiKey.keyName") || "Key Name"}</Label>
                  <Input
                    id="keyName"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={t("apiKey.keyName") || "Enter key name"}
                  />
                </div>
                <div>
                  <Label htmlFor="keyDescription">{t("apiKey.keyDescription") || "Description"}</Label>
                  <Input
                    id="keyDescription"
                    value={newKeyDescription}
                    onChange={(e) => setNewKeyDescription(e.target.value)}
                    placeholder={t("apiKey.keyDescription") || "Enter description"}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked readOnly disabled className="mr-1" />
                  <Label>{t("apiKey.readOnly") || "Read Only"}</Label>
                  <input
                    type="checkbox"
                    checked={newKeyWrite}
                    onChange={e => setNewKeyWrite(e.target.checked)}
                    className="ml-4 mr-1"
                  />
                  <Label>{t("apiKey.readWrite") || "Read & Write"}</Label>
                </div>
                <div>
                  <Label htmlFor="expiresIn">{t("apiKey.expirationPeriod") || "Expiration Period"}</Label>
                  <Select value={newKeyExpiresIn} onValueChange={setNewKeyExpiresIn}>
                    <SelectTrigger id="expiresIn">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 {t("apiKey.days") || "days"}</SelectItem>
                      <SelectItem value="60">60 {t("apiKey.days") || "days"}</SelectItem>
                      <SelectItem value="90">90 {t("apiKey.days") || "days"}</SelectItem>
                      <SelectItem value="180">180 {t("apiKey.days") || "days"}</SelectItem>
                      <SelectItem value="permanent">{t("apiKey.permanent") || "Permanent"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createNewKey} className="w-full" disabled={apiKeys.length >= 5 || !newKeyName.trim()}>
                  {t("apiKey.createKey") || "Create Key"}
                </Button>
                {apiKeys.length >= 5 && <div className="text-red-600 text-sm">{t("apiKey.maxKeysReached") || "Maximum of 5 API keys allowed. Delete one to create a new key."}</div>}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex gap-4 items-center">
          <div className="relative" style={{ maxWidth: 320, flex: '0 1 auto' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("apiKey.search") || "Search API keys..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-xs"
              style={{ minWidth: 0 }}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t("table.selectStatus") || "Filter by status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("table.allStatus") || "All Status"}</SelectItem>
              <SelectItem value="active">{t("table.active") || "Active"}</SelectItem>
              <SelectItem value="disabled">{t("table.disabled") || "Disabled"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("table.apiKeys") || "API Keys"}</CardTitle>
          <CardDescription>{t("table.apiKeysDesc") || "Manage your API keys. You can have up to 5 active keys."}</CardDescription>
        </CardHeader>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name") || "Name"}</TableHead>
                <TableHead>{t("apiKey.description") || "Description"}</TableHead>
                <TableHead>{t("table.status") || "Status"}</TableHead>
                <TableHead>{t("apiKey.expiration") || "Expiration"}</TableHead>
                <TableHead>{t("table.permissions") || "Permissions"}</TableHead>
                <TableHead>{t("apiKey.keyValue") || "Key Value"}</TableHead>
                <TableHead>{t("table.created") || "Created"}</TableHead>
                <TableHead>{t("table.actions") || "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApiKeys.map((key) => (
                <TableRow key={key.key_id}>
                  <TableCell>{key.name}</TableCell>
                  <TableCell>{key.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={key.is_active ? "default" : "destructive"}>
                      {key.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {key.expires_in_days ? ApiKeyService.getExpirationText(key.expires_in_days, key.created_at, (k, vars) => t(k, vars)) : (t("apiKey.permanent") || "Permanent")}
                  </TableCell>
                  <TableCell>{ApiKeyService.getPermissionsText(key.permissions, t)}</TableCell>
                  <TableCell>
                    {key.full_key ? (
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {showKeys[key.key_id] ? key.full_key : "••••••••••••••••••••••••••••••••••••••••••••••••"}
                        </div>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          onClick={() => toggleKeyVisibility(key.key_id)}
                          title={showKeys[key.key_id] ? (t("apiKey.hide") || "Hide") : (t("apiKey.view") || "View")}
                          disabled={!key.full_key}
                        >
                          {showKeys[key.key_id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          onClick={() => copyToClipboard(key.full_key!)}
                          title={t("apiKey.copy") || "Copy"}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {key.prefix}...
                        </div>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          onClick={() => copyToClipboard(key.prefix + "...")}
                          title={t("apiKey.copy") || "Copy"}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{key.created_at ? new Date(key.created_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleToggleKeyStatus(key.key_id)} 
                      title={key.is_active ? (t("apiKey.disable") || "Disable") : (t("apiKey.enable") || "Enable")}
                    >
                      {key.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => openDeleteDialog(key.key_id, key.name)} 
                      title={key.is_active ? (t("apiKey.cannotDeleteActive") || "Cannot delete an active API key. Please disable it first.") : (t("apiKey.deleteKey") || "Delete API Key")}
                      disabled={key.is_active}
                      className={key.is_active ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredApiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {loading ? "Loading..." : (t("table.noKeys") || "No API keys found.")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ActionConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteKey}
        isLoading={deleteDialog.isLoading}
        itemName={deleteDialog.keyName}
        itemType={t("table.apiKey") || "API Key"}
        action="delete"
        warningMessage={t("apiKey.deleteWarning") || `Are you sure you want to delete the API key "${deleteDialog.keyName}"? This action cannot be undone.`}
      />

      {/* Disable Confirmation Dialog */}
      <ActionConfirmationDialog
        isOpen={disableDialog.isOpen}
        onClose={closeDisableDialog}
        onConfirm={confirmDisableKey}
        isLoading={disableDialog.isLoading}
        itemName={disableDialog.keyName}
        itemType={t("table.apiKey") || "API Key"}
        action="disable"
        warningMessage={t("apiKey.disableWarning") || `Disabling this API key will immediately stop all applications and services using it. This may cause service interruptions. Are you sure you want to disable this key?`}
      />
    </div>
  )
}

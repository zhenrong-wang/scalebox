"use client"

import { useState, useEffect } from "react"
import { Plus, Copy, Eye, EyeOff, Trash2, Search, Filter, Power, PowerOff, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ActionConfirmationDialog } from "./action-confirmation-dialog"
import { useLanguage } from "../contexts/language-context"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ApiKeyService } from "../services/api-key-service"
import type { ApiKey } from "../services/api-key-service"
import { format, parseISO } from "date-fns"
import { ResizableTable, ResizableTableHead, ResizableTableCell } from "@/components/ui/resizable-table"
import { TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { PageLayout } from "@/components/ui/page-layout"

// Extended interface to include the full API key for display
interface ApiKeyWithFullKey extends ApiKey {
  full_key?: string; // The full API key for display
  remaining_days?: number; // Calculated remaining days
  is_expired?: boolean; // Whether the key is expired
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

  // Extend expiration state
  const [extendDialog, setExtendDialog] = useState<{
    isOpen: boolean
    keyId: string
    keyName: string
    isLoading: boolean
    extendByDays: string
  }>({
    isOpen: false,
    keyId: "",
    keyName: "",
    isLoading: false,
    extendByDays: "30",
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
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to load API keys")
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
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to update API key status");
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

  const openExtendDialog = (keyId: string, keyName: string) => {
    setExtendDialog({
      isOpen: true,
      keyId,
      keyName,
      isLoading: false,
      extendByDays: "30",
    })
  }

  const closeExtendDialog = () => {
    setExtendDialog({
      isOpen: false,
      keyId: "",
      keyName: "",
      isLoading: false,
      extendByDays: "30",
    })
  }

  const confirmExtendKey = async () => {
    setExtendDialog((prev) => ({ ...prev, isLoading: true }))
    setError("")
    setSuccess("")
    
    try {
      const request: any = {}
      
      if (extendDialog.extendByDays && extendDialog.extendByDays !== "permanent") {
        request.extend_by_days = parseInt(extendDialog.extendByDays)
      } else if (extendDialog.extendByDays === "permanent") {
        request.make_permanent = true
      }
      
      await ApiKeyService.extendApiKeyExpiration(extendDialog.keyId, request)
      
      setSuccess(t("apiKey.expirationExtended") || "API key expiration extended successfully!")
      closeExtendDialog()
      fetchApiKeys() // Refresh the list to show updated expiration
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to extend API key expiration")
    } finally {
      setExtendDialog((prev) => ({ ...prev, isLoading: false }))
    }
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
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to update API key status");
    }
  }

  const confirmDeleteKey = async () => {
    setDeleteDialog((prev) => ({ ...prev, isLoading: true }))
    setError("")
    try {
      await ApiKeyService.deleteApiKey(deleteDialog.keyId)
      setApiKeys((prev) => prev.filter((key) => key.key_id !== deleteDialog.keyId))
      setSuccess(t("action.deleted") || "Deleted!")
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Failed to delete API key")
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
    } catch (e: unknown) {
      const error = e as Error;
      // Check if it's a duplicate name error and use the translated message
      if (error.message && error.message.includes("must be unique")) {
        setDialogError(t("apiKey.duplicateName") || "An API key with this name already exists. Please choose a different name.");
      } else {
        setDialogError(error.message || "Failed to create API key");
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

  // Prepare summary cards data
  const summaryCards = [
    {
      title: t("table.totalKeys") || "Total Keys",
      value: totalKeys,
      icon: <Power className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.activeKeys") || "Active Keys",
      value: activeKeys,
      icon: <Power className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.disabledKeys") || "Disabled Keys",
      value: totalKeys - activeKeys,
      icon: <PowerOff className="h-4 w-4 text-muted-foreground" />
    }
  ]

  return (
    <PageLayout
      header={{
        description: t("apiKey.description") || "Manage your API keys for accessing ScaleBox services",
        children: (
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
              <Button disabled={apiKeys.length >= 5}>
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
        )
      }}
      summaryCards={summaryCards}
    >
      {error && <div className="text-red-600 font-medium">{error}</div>}
      {success && <div className="text-green-600 font-medium">{success}</div>}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <ResizableTable
            defaultColumnWidths={{
              name: 140,
              description: 180,
              status: 90,
              expiration: 120,
              permissions: 110,
              keyValue: 280,
              created: 110,
              actions: 160
            }}
          >
            <TableHeader>
              <TableRow>
                <ResizableTableHead columnId="name" defaultWidth={140}>{t("table.name") || "Name"}</ResizableTableHead>
                <ResizableTableHead columnId="description" defaultWidth={180}>{t("table.description") || "Description"}</ResizableTableHead>
                <ResizableTableHead columnId="status" defaultWidth={90}>{t("table.status") || "Status"}</ResizableTableHead>
                <ResizableTableHead columnId="expiration" defaultWidth={120}>{t("apiKey.expiration") || "Expiration"}</ResizableTableHead>
                <ResizableTableHead columnId="permissions" defaultWidth={110}>{t("table.permissions") || "Permissions"}</ResizableTableHead>
                <ResizableTableHead columnId="keyValue" defaultWidth={280}>{t("apiKey.keyValue") || "Key Value"}</ResizableTableHead>
                <ResizableTableHead columnId="created" defaultWidth={110}>{t("table.created") || "Created"}</ResizableTableHead>
                <ResizableTableHead columnId="actions" defaultWidth={160}>{t("table.actions") || "Actions"}</ResizableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApiKeys.map((apiKey) => (
                <TableRow key={apiKey.key_id}>
                  <ResizableTableCell>
                    <div className="font-medium break-words">{apiKey.name}</div>
                  </ResizableTableCell>
                  <ResizableTableCell className="break-words">{apiKey.description || "-"}</ResizableTableCell>
                  <ResizableTableCell>
                    <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                      {apiKey.is_active ? (t("table.active") || "Active") : (t("table.disabled") || "Disabled")}
                    </Badge>
                  </ResizableTableCell>
                  <ResizableTableCell>
                    <div className="flex flex-col gap-1">
                      {apiKey.is_expired ? (
                        <Badge variant="destructive" className="w-fit">
                          {t("apiKey.expired") || "Expired"}
                        </Badge>
                      ) : apiKey.expires_in_days === null || apiKey.expires_in_days === undefined ? (
                        <Badge variant="outline" className="w-fit">
                          {t("apiKey.permanent") || "Permanent"}
                        </Badge>
                      ) : apiKey.remaining_days !== undefined ? (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              apiKey.remaining_days <= 7 ? "destructive" : 
                              apiKey.remaining_days <= 30 ? "secondary" : 
                              "outline"
                            }
                            className="w-fit"
                          >
                            {apiKey.remaining_days} {t("apiKey.days") || "days"}
                          </Badge>
                          {apiKey.remaining_days <= 7 && (
                            <span className="text-xs text-red-600">
                              {t("apiKey.expiresSoon") || "Expires soon!"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="w-fit">
                          {t("apiKey.permanent") || "Permanent"}
                        </Badge>
                      )}
                    </div>
                  </ResizableTableCell>
                  <ResizableTableCell>
                    <div className="break-words">
                      <Badge variant="outline">
                        {apiKey.permissions.write ? (t("apiKey.readWrite") || "Read & Write") : (t("apiKey.readOnly") || "Read Only")}
                      </Badge>
                    </div>
                  </ResizableTableCell>
                  <ResizableTableCell>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-xs bg-muted px-2 py-1 rounded overflow-x-auto whitespace-nowrap flex-1" style={{ minWidth: '180px', maxWidth: '240px' }}>
                        {showKeys[apiKey.key_id] ? (apiKey.full_key || `${apiKey.prefix}...`) : '*'.repeat(40)}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.key_id)}
                          title={showKeys[apiKey.key_id] ? (t("apiKey.hideKey") || "Hide key") : (t("apiKey.showKey") || "Show key")}
                          className="h-8 w-8 p-0 flex-shrink-0"
                        >
                          {showKeys[apiKey.key_id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.full_key || `${apiKey.prefix}...`)}
                          title={t("apiKey.copyKey") || "Copy key"}
                          className="h-8 w-8 p-0 flex-shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </ResizableTableCell>
                  <ResizableTableCell>
                    {format(parseISO(apiKey.created_at), "MMM dd, yyyy")}
                  </ResizableTableCell>
                  <ResizableTableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openExtendDialog(apiKey.key_id, apiKey.name)}
                        title={t("apiKey.extendKey") || "Extend expiration"}
                        disabled={apiKey.expires_in_days === null || apiKey.expires_in_days === undefined}
                        className="h-8 w-8 p-0"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleKeyStatus(apiKey.key_id)}
                        title={apiKey.is_active ? (t("apiKey.disableKey") || "Disable key") : (t("apiKey.enableKey") || "Enable key")}
                        className="h-8 w-8 p-0"
                      >
                        {apiKey.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(apiKey.key_id, apiKey.name)}
                        title={t("apiKey.deleteKey") || "Delete key"}
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
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <ActionConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteKey}
        itemName={deleteDialog.keyName}
        itemType="API Key"
        action="delete"
        isLoading={deleteDialog.isLoading}
        warningMessage={t("apiKey.deleteWarning") || "Deleting this API key will immediately disable any applications or services using it. This action cannot be undone."}
      />

      <ActionConfirmationDialog
        isOpen={disableDialog.isOpen}
        onClose={closeDisableDialog}
        onConfirm={confirmDisableKey}
        itemName={disableDialog.keyName}
        itemType="API Key"
        action="disable"
        isLoading={disableDialog.isLoading}
        warningMessage={t("apiKey.disableWarning") || "Disabling this API key will immediately stop all applications and services using it. This may cause service interruptions."}
      />

      {/* Extend Expiration Dialog */}
      <Dialog open={extendDialog.isOpen} onOpenChange={closeExtendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("apiKey.extendExpiration") || "Extend API Key Expiration"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="extend-days">{t("apiKey.extendByDays") || "Extend by days"}</Label>
              <Select value={extendDialog.extendByDays} onValueChange={(value) => setExtendDialog(prev => ({ ...prev, extendByDays: value }))}>
                <SelectTrigger id="extend-days">
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
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={closeExtendDialog}>
                {t("action.cancel") || "Cancel"}
              </Button>
              <Button 
                onClick={confirmExtendKey} 
                disabled={extendDialog.isLoading || !extendDialog.extendByDays}
              >
                {extendDialog.isLoading ? (t("action.loading") || "Loading...") : (t("apiKey.extend") || "Extend")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

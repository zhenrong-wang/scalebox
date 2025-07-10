"use client"

import { useState, useEffect } from "react"
import { Plus, Copy, Eye, EyeOff, Trash2, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { useLanguage } from "../contexts/language-context"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiKeyService } from "../services/api-key-service"
import type { ApiKey } from "../services/api-key-service"

export function ApiKeyPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyWrite, setNewKeyWrite] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  const toggleKeyVisibility = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key)
    setSuccess(t("action.copied") || "Copied!")
    setTimeout(() => setSuccess("") , 1500)
  }

  const toggleKeyStatus = (id: string) => {
    setApiKeys((prev) =>
      prev.map((key) => (key.key_id === id ? { ...key, is_active: !key.is_active } : key)),
    )
  }

  const openDeleteDialog = (keyId: string, keyName: string) => {
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
    setError("")
    setSuccess("")
    setCreatedKey(null)
    if (!newKeyName.trim()) return
    if (apiKeys.length >= 5) {
      setError("Maximum of 5 API keys allowed. Delete one to create a new key.")
      return
    }
    setLoading(true)
    try {
      const res = await ApiKeyService.createApiKey({ name: newKeyName, can_write: newKeyWrite })
      setCreatedKey(res.api_key)
      setSuccess("API key created! Please copy and store it securely. It will not be shown again.")
      setIsDialogOpen(false)
      setNewKeyName("")
      setNewKeyWrite(true)
      fetchApiKeys()
    } catch (e: any) {
      setError(e.message || "Failed to create API key")
    } finally {
      setLoading(false)
    }
  }

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" disabled={apiKeys.length >= 5}>
                <Plus className="h-4 w-4 mr-2" />
                {t("action.createKey")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("action.createKey")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyName">{t("table.name")}</Label>
                  <Input
                    id="keyName"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={t("table.name")}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked readOnly disabled className="mr-1" />
                  <Label>Read</Label>
                  <input
                    type="checkbox"
                    checked={newKeyWrite}
                    onChange={e => setNewKeyWrite(e.target.checked)}
                    className="ml-4 mr-1"
                  />
                  <Label>Write</Label>
                </div>
                <Button onClick={createNewKey} className="w-full" disabled={apiKeys.length >= 5 || !newKeyName.trim()}>
                  {t("action.createKey")}
                </Button>
                {apiKeys.length >= 5 && <div className="text-red-600 text-sm">Maximum of 5 API keys allowed. Delete one to create a new key.</div>}
                {createdKey && <div className="text-green-700 text-sm">API Key: <span className="font-mono">{createdKey}</span></div>}
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
              <SelectItem value="active">{t("table.active")}</SelectItem>
              <SelectItem value="disabled">{t("table.disabled")}</SelectItem>
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
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.permissions")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead>{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApiKeys.map((key) => (
                <TableRow key={key.key_id}>
                  <TableCell>{key.name}</TableCell>
                  <TableCell>
                    <Badge variant={key.is_active ? "default" : "destructive"}>
                      {key.is_active ? t("status.active") || "Active" : t("status.disabled") || "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>{ApiKeyService.getPermissionsText(key.permissions)}</TableCell>
                  <TableCell>{key.created_at ? new Date(key.created_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(key.prefix + "... (full key only shown on creation)") } title="Copy API Key Prefix">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => openDeleteDialog(key.key_id, key.name)} title="Delete API Key">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredApiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {loading ? "Loading..." : t("table.noKeys") || "No API keys found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteKey}
        isLoading={deleteDialog.isLoading}
        itemName={deleteDialog.keyName}
        itemType={t("table.apiKey") || "API Key"}
        warningMessage={t("apiKey.deleteWarning") || `Are you sure you want to delete the API key "${deleteDialog.keyName}"? This action cannot be undone.`}
      />
    </div>
  )
}

"use client"

import { useState } from "react"
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

interface ApiKey {
  id: string
  name: string
  key: string
  status: "active" | "disabled"
  created: string
  lastUsed: string
}

const mockApiKeys: ApiKey[] = [
  {
    id: "key-001",
    name: "Production API",
    key: "sb-1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z",
    status: "active",
    created: "2024-01-15",
    lastUsed: "2 hours ago",
  },
  {
    id: "key-002",
    name: "Development API",
    key: "sb-9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g9f8e7d6c5b4a",
    status: "active",
    created: "2024-01-10",
    lastUsed: "1 day ago",
  },
  {
    id: "key-003",
    name: "Testing API",
    key: "sb-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    status: "disabled",
    created: "2024-01-05",
    lastUsed: "1 week ago",
  },
  {
    id: "key-004",
    name: "Staging API",
    key: "sb-z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1",
    status: "active",
    created: "2024-01-01",
    lastUsed: "3 days ago",
  },
]

export function ApiKeyPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [newKeyName, setNewKeyName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

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

  const toggleKeyVisibility = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key)
  }

  const toggleKeyStatus = (id: string) => {
    setApiKeys((prev) =>
      prev.map((key) => (key.id === id ? { ...key, status: key.status === "active" ? "disabled" : "active" } : key)),
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

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Actually delete the key
    setApiKeys((prev) => prev.filter((key) => key.id !== deleteDialog.keyId))

    closeDeleteDialog()
  }

  const createNewKey = () => {
    if (!newKeyName.trim()) return

    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      key: `sb-${Math.random().toString(36).substring(2, 18)}${Math.random().toString(36).substring(2, 18)}${Math.random().toString(36).substring(2, 18)}`,
      status: "active",
      created: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
    }

    setApiKeys((prev) => [newKey, ...prev])
    setNewKeyName("")
    setIsDialogOpen(false)
  }

  const filteredApiKeys = apiKeys.filter((apiKey) => {
    const matchesSearch = apiKey.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || apiKey.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeKeys = apiKeys.filter((key) => key.status === "active").length
  const totalKeys = apiKeys.length

  return (
    <div className="space-y-6">
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
              <Button className="w-full">
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
                <Button onClick={createNewKey} className="w-full">
                  {t("action.createKey")}
                </Button>
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

      {/* API Keys Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("table.apiKeys") || "API Keys"}</CardTitle>
            <CardDescription>
              {filteredApiKeys.length} {t("table.apiKeys") || "API keys"} found
            </CardDescription>
          </div>
          {/* Placeholder for future batch actions */}
        </CardHeader>
        <div className="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.apiKey") || "API Key"}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead>{t("table.lastUsed")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApiKeys.map((apiKey) => (
                <TableRow key={apiKey.id} className="hover:bg-accent">
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded font-mono max-w-xs truncate">
                        {showKeys[apiKey.id] ? apiKey.key : apiKey.key.substring(0, 8) + "•".repeat(35)}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => toggleKeyVisibility(apiKey.id)}>
                        {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(apiKey.key)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={apiKey.status === "active" ? "default" : "secondary"}
                      className={apiKey.status === "active" ? "bg-green-100 text-green-800" : ""}
                    >
                      {t(`table.${apiKey.status}`) || apiKey.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{apiKey.created}</TableCell>
                  <TableCell>{apiKey.lastUsed}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex space-x-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => toggleKeyStatus(apiKey.id)}>
                        {apiKey.status === "active" ? t("action.disable") : t("action.enable")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(apiKey.id, apiKey.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteKey}
        itemName={deleteDialog.keyName}
        itemType={t("table.apiKey") || "API Key"}
        isLoading={deleteDialog.isLoading}
        warningMessage={t("apiKey.deleteWarning") || "Deleting this API key will immediately disable any applications or services using it. This action cannot be undone."}
      />
    </div>
  )
}

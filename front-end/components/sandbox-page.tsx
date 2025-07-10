"use client"

import { useState, useEffect } from "react"
import { Play, Square, Trash2, Search, Filter, Plus, Activity, Cpu, HardDrive, Clock, DollarSign, Calendar, X, Check, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "../contexts/language-context"
import { SandboxService } from "../services/sandbox-service"
import type { Sandbox, SandboxStats } from "../types/sandbox"
import { Label } from "@/components/ui/label"

type SortField = "name" | "framework" | "status" | "createdAt" | "uptime"
type SortOrder = "asc" | "desc"

export function SandboxPage() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([])
  const [stats, setStats] = useState<SandboxStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedSandboxes, setSelectedSandboxes] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [dateRange, setDateRange] = useState<{ from: string | null, to: string | null }>({ from: null, to: null })
  
  // Confirmation dialogs
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, sandboxId: string | null, isBatch: boolean }>({
    isOpen: false,
    sandboxId: null,
    isBatch: false
  })
  const [stopDialog, setStopDialog] = useState<{ isOpen: boolean, sandboxId: string | null, isBatch: boolean }>({
    isOpen: false,
    sandboxId: null,
    isBatch: false
  })
  const [startDialog, setStartDialog] = useState<{ isOpen: boolean, sandboxId: string | null, isBatch: boolean }>({
    isOpen: false,
    sandboxId: null,
    isBatch: false
  })

  const { t } = useLanguage()

  useEffect(() => {
    loadSandboxes()
    loadStats()
  }, [])

  const loadSandboxes = async () => {
    try {
      const data = await SandboxService.listSandboxes()
      setSandboxes(data)
    } catch (error) {
      console.error('Failed to load sandboxes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await SandboxService.getSandboxStats()
      // Map API response to match TypeScript interface
      const mappedStats: SandboxStats = {
        total: data.total_sandboxes,
        running: data.running_sandboxes,
        stopped: data.stopped_sandboxes,
        deleted: data.deleted_sandboxes,
        error: data.error_sandboxes,
        totalCost: data.total_cost,
        avgCpuUsage: data.avg_cpu_usage,
        avgMemoryUsage: data.avg_memory_usage,
        totalUptime: data.total_uptime_hours,
        topFrameworks: [],
        topUsers: [],
        regionDistribution: []
      }
      setStats(mappedStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleStartSandbox = async (sandboxId: string) => {
    try {
      await SandboxService.startSandbox(sandboxId)
      await loadSandboxes()
      await loadStats()
    } catch (error) {
      console.error('Failed to start sandbox:', error)
    }
  }

  const handleStopSandbox = async (sandboxId: string) => {
    try {
      await SandboxService.stopSandbox(sandboxId)
      await loadSandboxes()
      await loadStats()
    } catch (error) {
      console.error('Failed to stop sandbox:', error)
    }
  }

  const handleDeleteSandbox = async (sandboxId: string) => {
    try {
      await SandboxService.deleteSandbox(sandboxId)
      await loadSandboxes()
      await loadStats()
    } catch (error) {
      console.error('Failed to delete sandbox:', error)
    }
  }

  const handleBatchStart = async () => {
    try {
      const promises = Array.from(selectedSandboxes).map(id => 
        SandboxService.startSandbox(id)
      )
      await Promise.all(promises)
      await loadSandboxes()
      await loadStats()
      setSelectedSandboxes(new Set())
    } catch (error) {
      console.error('Failed to start sandboxes:', error)
    }
  }

  const handleBatchStop = async () => {
    try {
      const promises = Array.from(selectedSandboxes).map(id => 
        SandboxService.stopSandbox(id)
      )
      await Promise.all(promises)
      await loadSandboxes()
      await loadStats()
      setSelectedSandboxes(new Set())
    } catch (error) {
      console.error('Failed to stop sandboxes:', error)
    }
  }

  const handleBatchDelete = async () => {
    try {
      const promises = Array.from(selectedSandboxes).map(id => 
        SandboxService.deleteSandbox(id)
      )
      await Promise.all(promises)
      await loadSandboxes()
      await loadStats()
      setSelectedSandboxes(new Set())
    } catch (error) {
      console.error('Failed to delete sandboxes:', error)
    }
  }

  const formatUptime = (uptimeMinutes: number): string => {
    if (uptimeMinutes === 0) return "0m"
    const hours = Math.floor(uptimeMinutes / 60)
    const minutes = uptimeMinutes % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      running: "default",
      stopped: "secondary",
      error: "destructive",
      deleted: "destructive",
    } as const

    const statusTranslations = {
      running: t("table.running") || "Running",
      stopped: t("table.stopped") || "Stopped",
      error: t("table.error") || "Error",
      deleted: t("table.deleted") || "Deleted",
    }

    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
      {statusTranslations[status as keyof typeof statusTranslations] || status}
    </Badge>
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const handleSelectAll = () => {
    if (selectedSandboxes.size === filteredSandboxes.length) {
      setSelectedSandboxes(new Set())
    } else {
      setSelectedSandboxes(new Set(filteredSandboxes.map(s => s.id)))
    }
  }

  const handleSelectSandbox = (sandboxId: string, checked: boolean) => {
    const newSelected = new Set(selectedSandboxes)
    if (checked) {
      newSelected.add(sandboxId)
    } else {
      newSelected.delete(sandboxId)
    }
    setSelectedSandboxes(newSelected)
  }

  const filteredSandboxes = sandboxes.filter((sandbox) => {
    const matchesSearch = sandbox.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sandbox.description && sandbox.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || sandbox.status === statusFilter
    
    let matchesDate = true
    if (dateRange.from) {
      matchesDate = matchesDate && new Date(sandbox.createdAt) >= new Date(dateRange.from)
    }
    if (dateRange.to) {
      matchesDate = matchesDate && new Date(sandbox.createdAt) <= new Date(dateRange.to)
    }
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const sortedSandboxes = [...filteredSandboxes].sort((a, b) => {
    let aVal: any, bVal: any
    
    switch (sortField) {
      case "name":
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case "framework":
        aVal = a.framework.toLowerCase()
        bVal = b.framework.toLowerCase()
        break
      case "status":
        aVal = a.status.toLowerCase()
        bVal = b.status.toLowerCase()
        break
      case "createdAt":
        aVal = new Date(a.createdAt).getTime()
        bVal = new Date(b.createdAt).getTime()
        break
      case "uptime":
        aVal = a.uptime
        bVal = b.uptime
        break
      default:
        return 0
    }
    
    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  const openDatePicker = (type: 'from' | 'to', event: React.MouseEvent<HTMLButtonElement>) => {
    // Get the button element that was clicked
    const button = event.currentTarget
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
    
    // Focus and show the input
    input.focus()
    
    // Try to show the picker for modern browsers
    if (input.showPicker) {
      input.showPicker()
    }
    
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      if (target.value) {
        setDateRange(prev => ({ ...prev, [type]: target.value }))
      }
      document.body.removeChild(input)
    })
    
    // Track if the input has been removed
    let isRemoved = false
    
    const removeInput = () => {
      if (!isRemoved && document.body.contains(input)) {
        document.body.removeChild(input)
        isRemoved = true
        document.removeEventListener('keydown', handleEscape)
      }
    }
    
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      if (target.value) {
        setDateRange(prev => ({ ...prev, [type]: target.value }))
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
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">
              {t("table.totalSandboxes") || "Total Sandboxes"}
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-blue-600">{stats.avgCpuUsage.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">
              {t("table.avgCpuUsage") || "Avg CPU Usage"}
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-foreground">{stats.avgMemoryUsage.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">
              {t("table.avgMemoryUsage") || "Avg Memory Usage"}
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-foreground">${stats.totalCost.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">
              {t("table.totalCost") || "Total Cost"}
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <Button asChild className="w-full">
              <a href="https://docs.scalebox.dev/sandboxes" target="_blank" rel="noopener noreferrer">
                <Plus className="h-4 w-4 mr-2" />
                {t("action.createSandbox") || "Create Sandbox"}
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("sandbox.search") || "Search sandboxes..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t("table.selectStatus") || "Filter by status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("table.allStatus") || "All Status"}</SelectItem>
                  <SelectItem value="running">{t("table.running") || "Running"}</SelectItem>
                  <SelectItem value="stopped">{t("table.stopped") || "Stopped"}</SelectItem>
                  <SelectItem value="error">{t("table.error") || "Error"}</SelectItem>
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
                    onClick={(e) => openDatePicker('from', e)}
                    className="w-[120px] h-8 text-sm justify-start"
                  >
                    {dateRange.from ? new Date(dateRange.from).toLocaleDateString() : "From"}
                  </Button>
                </div>
                <span className="text-muted-foreground text-sm">to</span>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => openDatePicker('to', e)}
                    className="w-[120px] h-8 text-sm justify-start"
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
        </CardContent>
      </Card>

      {/* Batch Actions */}
      {selectedSandboxes.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {t("table.itemsSelected", { count: String(selectedSandboxes.size), plural: selectedSandboxes.size > 1 ? 's' : '' }) || `${selectedSandboxes.size} items selected`}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStartDialog({ isOpen: true, sandboxId: null, isBatch: true })}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {t("table.startSelected") || "Start Selected"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStopDialog({ isOpen: true, sandboxId: null, isBatch: true })}
                >
                  <Square className="h-4 w-4 mr-1" />
                  {t("table.stopSelected") || "Stop Selected"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialog({ isOpen: true, sandboxId: null, isBatch: true })}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t("table.deleteSelected") || "Delete Selected"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sandboxes Table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t("table.loading") || "Loading sandboxes..."}</div>
            </div>
          ) : filteredSandboxes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("sandbox.noSandboxes") || "No sandboxes found."}</p>
              <p className="text-sm mt-2">
                {t("sandbox.createFirst") || "Create your first sandbox to get started."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedSandboxes.size === filteredSandboxes.length && filteredSandboxes.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.name") || "Name"}
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort("framework")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.framework") || "Framework"}
                      {getSortIcon("framework")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.status") || "Status"}
                      {getSortIcon("status")}
                    </div>
                  </TableHead>
                  <TableHead>{t("table.cpu") || "CPU"}</TableHead>
                  <TableHead>{t("table.memory") || "Memory"}</TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort("uptime")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.uptime") || "Uptime"}
                      {getSortIcon("uptime")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.created") || "Created"}
                      {getSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  <TableHead>{t("table.actions") || "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSandboxes.map((sandbox) => (
                  <TableRow key={sandbox.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSandboxes.has(sandbox.id)}
                        onCheckedChange={(checked) => handleSelectSandbox(sandbox.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sandbox.name}</div>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {sandbox.description || t("sandbox.noDescription") || "No description"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sandbox.framework}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(sandbox.status)}</TableCell>
                    <TableCell>{sandbox.resources.cpu.toFixed(1)}%</TableCell>
                    <TableCell>{sandbox.resources.memory.toFixed(1)}%</TableCell>
                    <TableCell>{formatUptime(sandbox.uptime)}</TableCell>
                    <TableCell>{formatDate(sandbox.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {sandbox.status === "stopped" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStartDialog({ isOpen: true, sandboxId: sandbox.id, isBatch: false })}
                            title={t("action.start") || "Start"}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {sandbox.status === "running" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStopDialog({ isOpen: true, sandboxId: sandbox.id, isBatch: false })}
                            title={t("action.stop") || "Stop"}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        {sandbox.status !== "deleted" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteDialog({ isOpen: true, sandboxId: sandbox.id, isBatch: false })}
                            title={t("action.delete") || "Delete"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, sandboxId: null, isBatch: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("table.confirmDelete") || "Confirm Delete"}</DialogTitle>
            <DialogDescription>
              {deleteDialog.isBatch 
                ? t("table.confirmDeleteMessage") || `Are you sure you want to delete ${selectedSandboxes.size} sandbox${selectedSandboxes.size > 1 ? 'es' : ''}? This action cannot be undone.`
                : t("table.confirmDeleteMessage") || "Are you sure you want to delete this sandbox? This action cannot be undone."
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, sandboxId: null, isBatch: false })}>
              {t("action.cancel") || "Cancel"}
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (deleteDialog.isBatch) {
                  await handleBatchDelete()
                } else if (deleteDialog.sandboxId) {
                  await handleDeleteSandbox(deleteDialog.sandboxId)
                }
                setDeleteDialog({ isOpen: false, sandboxId: null, isBatch: false })
              }}
            >
              {t("action.delete") || "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stopDialog.isOpen} onOpenChange={(open) => !open && setStopDialog({ isOpen: false, sandboxId: null, isBatch: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("table.confirmStop") || "Confirm Stop"}</DialogTitle>
            <DialogDescription>
              {stopDialog.isBatch 
                ? t("table.confirmStopMessage", { count: String(selectedSandboxes.size), plural: selectedSandboxes.size > 1 ? 'es' : '' }) || `Are you sure you want to stop ${selectedSandboxes.size} sandbox${selectedSandboxes.size > 1 ? 'es' : ''}?`
                : t("table.confirmStopMessage", { count: "1", plural: "" }) || "Are you sure you want to stop this sandbox?"
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialog({ isOpen: false, sandboxId: null, isBatch: false })}>
              {t("action.cancel") || "Cancel"}
            </Button>
            <Button 
              onClick={async () => {
                if (stopDialog.isBatch) {
                  await handleBatchStop()
                } else if (stopDialog.sandboxId) {
                  await handleStopSandbox(stopDialog.sandboxId)
                }
                setStopDialog({ isOpen: false, sandboxId: null, isBatch: false })
              }}
            >
              {t("action.stop") || "Stop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={startDialog.isOpen} onOpenChange={(open) => !open && setStartDialog({ isOpen: false, sandboxId: null, isBatch: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("table.confirmStart") || "Confirm Start"}</DialogTitle>
            <DialogDescription>
              {startDialog.isBatch 
                ? t("table.confirmStartMessage", { count: String(selectedSandboxes.size), plural: selectedSandboxes.size > 1 ? 'es' : '' }) || `Are you sure you want to start ${selectedSandboxes.size} sandbox${selectedSandboxes.size > 1 ? 'es' : ''}?`
                : t("table.confirmStartMessage", { count: "1", plural: "" }) || "Are you sure you want to start this sandbox?"
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialog({ isOpen: false, sandboxId: null, isBatch: false })}>
              {t("action.cancel") || "Cancel"}
            </Button>
            <Button 
              onClick={async () => {
                if (startDialog.isBatch) {
                  await handleBatchStart()
                } else if (startDialog.sandboxId) {
                  await handleStartSandbox(startDialog.sandboxId)
                }
                setStartDialog({ isOpen: false, sandboxId: null, isBatch: false })
              }}
            >
              {t("action.start") || "Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

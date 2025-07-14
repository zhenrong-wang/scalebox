"use client"

import { useState, useEffect } from "react"
import { Play, Square, Trash2, Plus, Activity, Cpu, HardDrive, Clock, DollarSign, Calendar, X, Check, Search, Filter } from "lucide-react"

import { SortIndicator } from "@/components/ui/sort-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResizableTable, ResizableTableHead, ResizableTableCell } from "@/components/ui/resizable-table"
import { TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useLanguage } from "../contexts/language-context"
import { SandboxService } from "../services/sandbox-service"
import type { Sandbox, SandboxStats } from "../types/sandbox"
import { Label } from "@/components/ui/label"
import { PageLayout } from "@/components/ui/page-layout"
import { SearchFilters } from "@/components/ui/search-filters"

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
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active")
  
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

  const [metricsDialog, setMetricsDialog] = useState<{ open: boolean, sandbox: Sandbox | null }>({ open: false, sandbox: null })
  const [metricsType, setMetricsType] = useState<'cpu' | 'memory' | 'storage'>('cpu')
  const [metricsData, setMetricsData] = useState<Array<{ timestamp: string, value: number }>>([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsRange, setMetricsRange] = useState<{ start: string | null, end: string | null }>({ start: null, end: null })

  // Add state for permanently delete dialog
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<{ isOpen: boolean, sandboxId: string | null, isBatch: boolean }>({
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

  // Get permanently deleted sandbox IDs from localStorage
  const getPermanentlyDeletedIds = (): Set<string> => {
    const stored = localStorage.getItem('permanently_deleted_sandboxes')
    return stored ? new Set(JSON.parse(stored)) : new Set()
  }

  // Store permanently deleted sandbox IDs in localStorage
  const storePermanentlyDeletedId = (sandboxId: string) => {
    const deletedIds = getPermanentlyDeletedIds()
    deletedIds.add(sandboxId)
    localStorage.setItem('permanently_deleted_sandboxes', JSON.stringify(Array.from(deletedIds)))
  }

  const handlePermanentDelete = async (sandboxId: string) => {
    try {
      // Store the ID in localStorage so it won't appear after refresh
      storePermanentlyDeletedId(sandboxId)
      // Remove from frontend state
      setSandboxes(prev => prev.filter(s => s.id !== sandboxId))
      setSelectedSandboxes(prev => {
        const newSet = new Set(prev)
        newSet.delete(sandboxId)
        return newSet
      })
    } catch (error) {
      console.error('Failed to permanently delete sandbox:', error)
    }
  }

  const handleBatchPermanentDelete = async () => {
    try {
      // Store all selected IDs in localStorage
      const deletedIds = getPermanentlyDeletedIds()
      selectedSandboxes.forEach(id => deletedIds.add(id))
      localStorage.setItem('permanently_deleted_sandboxes', JSON.stringify(Array.from(deletedIds)))
      
      // Remove from frontend state
      setSandboxes(prev => prev.filter(s => !selectedSandboxes.has(s.id)))
      setSelectedSandboxes(new Set())
    } catch (error) {
      console.error('Failed to permanently delete sandboxes:', error)
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
    return (
      <SortIndicator
        isSorted={sortField === field}
        sortDirection={sortField === field ? sortOrder : undefined}
      />
    )
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

  const filteredSandboxes = sandboxes.filter(sandbox => {
    // Filter out permanently deleted sandboxes
    const permanentlyDeletedIds = getPermanentlyDeletedIds()
    if (permanentlyDeletedIds.has(sandbox.id)) {
      return false
    }
    
    // First filter by active/deleted tab
    const matchesTab = activeTab === "active" ? sandbox.status !== "deleted" : sandbox.status === "deleted"
    
    // Then apply other filters
    const matchesSearch = sandbox.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || sandbox.status === statusFilter
    const matchesDateRange = (!dateRange.from || new Date(sandbox.createdAt) >= new Date(dateRange.from)) &&
                            (!dateRange.to || new Date(sandbox.createdAt) <= new Date(dateRange.to))
    
    return matchesTab && matchesSearch && matchesStatus && matchesDateRange
  }).sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue
    }
    
    return 0
  })

  // Prepare summary cards data
  const summaryCards = stats ? [
    {
      title: t("table.totalSandboxes") || "Total Sandboxes",
      value: stats.total,
      icon: <Activity className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.avgCpuUsage") || "Avg CPU Usage",
      value: `${stats.avgCpuUsage.toFixed(1)}%`,
      icon: <Cpu className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.avgMemoryUsage") || "Avg Memory Usage",
      value: `${stats.avgMemoryUsage.toFixed(1)}%`,
      icon: <HardDrive className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.totalCost") || "Total Cost",
      value: `$${stats.totalCost.toFixed(2)}`,
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
    }
  ] : []

  // Calculate batch operation states
  const selectedSandboxesData = sandboxes.filter(s => selectedSandboxes.has(s.id))
  const allSelectedRunning = selectedSandboxesData.length > 0 && selectedSandboxesData.every(s => s.status === "running")
  const allSelectedStopped = selectedSandboxesData.length > 0 && selectedSandboxesData.every(s => s.status === "stopped")

  // Open date picker with proper localization
  const openDatePicker = (type: 'from' | 'to', event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    const buttonRect = button.getBoundingClientRect()
    
    const input = document.createElement('input')
    input.type = 'date'
    input.style.position = 'fixed'
    input.style.top = `${buttonRect.bottom + 5}px`
    input.style.left = `${buttonRect.left}px`
    input.style.zIndex = '9999'
    input.style.padding = '8px'
    input.style.border = '1px solid #d1d5db'
    input.style.borderRadius = '6px'
    input.style.fontSize = '14px'
    input.style.backgroundColor = 'white'
    input.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
    input.style.minWidth = '140px'
    
    // Set locale for date input based on current language
    const currentLang = localStorage.getItem('language') || 'en'
    if (currentLang === 'zh-CN') {
      input.setAttribute('lang', 'zh-CN')
      // Set Chinese locale for the input
      input.setAttribute('data-locale', 'zh-CN')
    }
    
    document.body.appendChild(input)
    input.focus()
    
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
    
    let isRemoved = false
    
    const removeInput = () => {
      if (!isRemoved && document.body.contains(input)) {
        document.body.removeChild(input)
        isRemoved = true
        document.removeEventListener('keydown', handleEscape)
      }
    }
    
    input.addEventListener('blur', () => {
      setTimeout(removeInput, 100)
    })
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        removeInput()
      }
    }
    document.addEventListener('keyup', handleEscape)
  }

  const openMetricsDialog = async (sandbox: Sandbox) => {
    setMetricsDialog({ open: true, sandbox })
    setMetricsType('cpu')
    setMetricsRange({ start: null, end: null })
    await fetchMetrics(sandbox.id, 'cpu', null, null)
  }

  const fetchMetrics = async (sandboxId: string, type: 'cpu' | 'memory' | 'storage', start: string | null, end: string | null) => {
    setMetricsLoading(true)
    try {
      const data = await SandboxService.getSandboxMetrics(sandboxId, type, start || undefined, end || undefined)
      setMetricsData(data)
    } catch (e) {
      setMetricsData([])
    } finally {
      setMetricsLoading(false)
    }
  }

  return (
    <PageLayout
      header={{
        description: t("sandbox.description") || "Manage your development sandboxes",
        children: (
          <Button asChild>
            <a href="https://docs.scalebox.dev/sandboxes" target="_blank" rel="noopener noreferrer">
              <Plus className="h-4 w-4 mr-2" />
              {t("action.createSandbox") || "Create Sandbox"}
            </a>
          </Button>
        )
      }}
      summaryCards={summaryCards}
    >
      {/* Filters and Search */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search and Status Filter */}
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="flex-1">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t("sandbox.search") || "Search sandboxes..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
            </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("table.selectStatus") || "Filter by status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("table.allStatus") || "All Status"}</SelectItem>
              {activeTab === "active" ? (
                <>
                  <SelectItem value="running">{t("table.running") || "Running"}</SelectItem>
                  <SelectItem value="stopped">{t("table.stopped") || "Stopped"}</SelectItem>
                  <SelectItem value="error">{t("table.error") || "Error"}</SelectItem>
                </>
              ) : (
                <SelectItem value="deleted">{t("table.deleted") || "Deleted"}</SelectItem>
              )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
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
                {dateRange.from ? new Date(dateRange.from).toLocaleDateString(localStorage.getItem('language') === 'zh-CN' ? 'zh-CN' : 'en-US') : t("table.from") || "From"}
                  </Button>
                </div>
            <span className="text-muted-foreground text-sm">{t("table.to") || "to"}</span>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => openDatePicker('to', e)}
                    className="w-[120px] h-8 text-sm justify-start"
                  >
                {dateRange.to ? new Date(dateRange.to).toLocaleDateString(localStorage.getItem('language') === 'zh-CN' ? 'zh-CN' : 'en-US') : t("table.to") || "To"}
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

      {/* Tabs for Active/Deleted Sandboxes */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as "active" | "deleted")
        setStatusFilter("all") // Reset status filter when switching tabs
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            {t("table.active") || "Active"} ({sandboxes.filter(s => s.status !== "deleted" && !getPermanentlyDeletedIds().has(s.id)).length})
          </TabsTrigger>
          <TabsTrigger value="deleted">
            {t("table.deleted") || "Deleted"} ({sandboxes.filter(s => s.status === "deleted" && !getPermanentlyDeletedIds().has(s.id)).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
                {activeTab === "active" ? (
                  <>
                <Button
                  variant="outline"
                  size="sm"
                      disabled={!allSelectedStopped}
                  onClick={() => setStartDialog({ isOpen: true, sandboxId: null, isBatch: true })}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {t("table.startSelected") || "Start Selected"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                      disabled={!allSelectedRunning}
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
                  </>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPermanentDeleteDialog({ isOpen: true, sandboxId: null, isBatch: true })}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("action.permanentlyDelete") || "Permanently Delete Selected"}
                  </Button>
                )}
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
              {activeTab === "active" ? (
                <>
                  <p>{t("sandbox.noActiveSandboxes") || "No active sandboxes found."}</p>
              <p className="text-sm mt-2">
                {t("sandbox.createFirst") || "Create your first sandbox to get started."}
              </p>
                </>
              ) : (
                <>
                  <p>{t("sandbox.noDeletedSandboxes") || "No deleted sandboxes found."}</p>
                  <p className="text-sm mt-2">
                    {t("sandbox.noDeletedSandboxesDesc") || "Deleted sandboxes will appear here for permanent deletion."}
                  </p>
                </>
              )}
            </div>
          ) : (
            <ResizableTable
              defaultColumnWidths={{
                checkbox: 48,
                name: 200,
                framework: 120,
                status: 100,
                cpu: 100,
                memory: 100,
                uptime: 100,
                created: 120,
                actions: 150
              }}
            >
              <TableHeader>
                <TableRow>
                  <ResizableTableHead columnId="checkbox" defaultWidth={48}>
                    <Checkbox
                      checked={selectedSandboxes.size === filteredSandboxes.length && filteredSandboxes.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="name"
                    defaultWidth={200}
                    className="cursor-pointer group"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.name") || "Name"}
                      {getSortIcon("name")}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="framework"
                    defaultWidth={120}
                    className="cursor-pointer group"
                    onClick={() => handleSort("framework")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.framework") || "Framework"}
                      {getSortIcon("framework")}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="status"
                    defaultWidth={100}
                    className="cursor-pointer group"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.status") || "Status"}
                      {getSortIcon("status")}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="cpu" defaultWidth={100}>
                    <div className="flex items-center gap-1">
                      <Cpu className="h-4 w-4" />
                      {t("table.cpu") || "CPU"}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="memory" defaultWidth={100}>
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-4 w-4" />
                      {t("table.memory") || "Memory"}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="uptime"
                    defaultWidth={100}
                    className="cursor-pointer group"
                    onClick={() => handleSort("uptime")}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {t("table.uptime") || "Uptime"}
                      {getSortIcon("uptime")}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="created"
                    defaultWidth={120}
                    className="cursor-pointer group"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t("table.created") || "Created"}
                      {getSortIcon("createdAt")}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="actions" defaultWidth={150}>
                    {t("table.actions") || "Actions"}
                  </ResizableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSandboxes.map((sandbox) => (
                  <TableRow key={sandbox.id}>
                    <ResizableTableCell>
                      <Checkbox
                        checked={selectedSandboxes.has(sandbox.id)}
                        onCheckedChange={(checked) => handleSelectSandbox(sandbox.id, checked as boolean)}
                      />
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <div>
                        <div className="font-medium">{sandbox.name}</div>
                        <div className="text-sm text-muted-foreground">{sandbox.id}</div>
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <Badge variant="outline">{sandbox.framework}</Badge>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      {getStatusBadge(sandbox.status)}
                    </ResizableTableCell>
                    <ResizableTableCell>{sandbox.cpu_spec || 0} vCPU</ResizableTableCell>
                    <ResizableTableCell>{sandbox.memory_spec || 0} GB</ResizableTableCell>
                    <ResizableTableCell>{formatUptime(sandbox.uptime)}</ResizableTableCell>
                    <ResizableTableCell>{formatDate(sandbox.createdAt)}</ResizableTableCell>
                    <ResizableTableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMetricsDialog(sandbox)}
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        {activeTab === "active" ? (
                          <>
                        {sandbox.status === "stopped" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStartDialog({ isOpen: true, sandboxId: sandbox.id, isBatch: false })}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {sandbox.status === "running" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStopDialog({ isOpen: true, sandboxId: sandbox.id, isBatch: false })}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                              onClick={() => setDeleteDialog({ isOpen: true, sandboxId: sandbox.id, isBatch: false })}
                        >
                              <Trash2 className="h-4 w-4" />
                        </Button>
                          </>
                        ) : (
                        <Button
                            variant="destructive"
                          size="sm"
                            onClick={() => setPermanentDeleteDialog({ isOpen: true, sandboxId: sandbox.id, isBatch: false })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    </ResizableTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>
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
                ? t("table.confirmDeleteMessage", { count: String(selectedSandboxes.size), plural: selectedSandboxes.size > 1 ? 'es' : '' }) || `Are you sure you want to delete ${selectedSandboxes.size} sandbox${selectedSandboxes.size > 1 ? 'es' : ''}? This action cannot be undone.`
                : t("table.confirmDeleteMessage", { count: "1", plural: "" }) || "Are you sure you want to delete this sandbox? This action cannot be undone."
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

      <Dialog open={metricsDialog.open} onOpenChange={open => setMetricsDialog({ open, sandbox: open ? metricsDialog.sandbox : null })}>
        <DialogContent className="max-w-3xl backdrop-blur">
          <DialogHeader>
            <DialogTitle>Sandbox Metrics</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 items-center mb-4">
            <select value={metricsType} onChange={e => {
              setMetricsType(e.target.value as any)
              if (metricsDialog.sandbox) fetchMetrics(metricsDialog.sandbox.id, e.target.value as any, metricsRange.start, metricsRange.end)
            }} className="border rounded px-2 py-1">
              <option value="cpu">CPU</option>
              <option value="memory">Memory</option>
              <option value="storage">Storage</option>
            </select>
            {/* Date range selectors (simple for now) */}
            <input type="date" value={metricsRange.start || ''} onChange={e => {
              const newStart = e.target.value || null
              setMetricsRange(r => ({ ...r, start: newStart }))
              if (metricsDialog.sandbox) fetchMetrics(metricsDialog.sandbox.id, metricsType, newStart, metricsRange.end)
            }} className="border rounded px-2 py-1" />
            <span>to</span>
            <input type="date" value={metricsRange.end || ''} onChange={e => {
              const newEnd = e.target.value || null
              setMetricsRange(r => ({ ...r, end: newEnd }))
              if (metricsDialog.sandbox) fetchMetrics(metricsDialog.sandbox.id, metricsType, metricsRange.start, newEnd)
            }} className="border rounded px-2 py-1" />
          </div>
          <div className="w-full h-96 bg-white dark:bg-gray-900 rounded shadow relative">
            {metricsLoading ? (
              <div className="flex items-center justify-center h-full">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="timestamp" tickFormatter={v => new Date(v).toLocaleString()} minTickGap={40} />
                  <YAxis />
                  <Tooltip labelFormatter={v => new Date(v).toLocaleString()} />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Permanent Delete Dialog */}
      <Dialog open={permanentDeleteDialog.isOpen} onOpenChange={(open) => !open && setPermanentDeleteDialog({ isOpen: false, sandboxId: null, isBatch: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("action.permanentlyDelete") || "Permanently Delete"}</DialogTitle>
            <DialogDescription>
              {permanentDeleteDialog.isBatch 
                ? t("sandbox.permanentlyDeleteBatchWarning") || "This will permanently delete all selected sandboxes from the frontend. They will still be retained in the backend for billing purposes."
                : t("sandbox.permanentlyDeleteWarning") || "This will permanently delete this sandbox from the frontend. It will still be retained in the backend for billing purposes."
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermanentDeleteDialog({ isOpen: false, sandboxId: null, isBatch: false })}>
              {t("action.cancel") || "Cancel"}
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (permanentDeleteDialog.isBatch) {
                  await handleBatchPermanentDelete()
                } else if (permanentDeleteDialog.sandboxId) {
                  await handlePermanentDelete(permanentDeleteDialog.sandboxId)
                }
                setPermanentDeleteDialog({ isOpen: false, sandboxId: null, isBatch: false })
              }}
            >
              {t("action.permanentlyDelete") || "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </PageLayout>
  )
}

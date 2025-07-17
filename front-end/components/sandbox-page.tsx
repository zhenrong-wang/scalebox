"use client"

import { useState, useEffect } from "react"
import { Play, Square, Trash2, Plus, Activity, Cpu, HardDrive, Clock, DollarSign, Calendar, X, Check, Search, Filter, ArrowRightLeft } from "lucide-react"

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts"
import { useLanguage } from "../contexts/language-context"
import { SandboxService } from "../services/sandbox-service"
import type { Sandbox, SandboxStats } from "../types/sandbox"
import { Label } from "@/components/ui/label"
import { PageLayout } from "@/components/ui/page-layout"
import { SearchFilters } from "@/components/ui/search-filters"
import { templateService, Template } from "../services/template-service"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { ProjectService, Project } from "../services/project-service"

type SortField = "name" | "project_name" | "status" | "createdAt" | "updatedAt" | "uptime"
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
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active")
  
  // Confirmation dialogs
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

  const [metricsDialog, setMetricsDialog] = useState<{ open: boolean, sandbox: Sandbox | null }>({
    open: false,
    sandbox: null
  })
  const [metricsType, setMetricsType] = useState<'cpu' | 'memory' | 'storage'>('cpu')
  const [metricsData, setMetricsData] = useState<Array<{ timestamp: string, value: number }>>([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsRange, setMetricsRange] = useState<{ start: string | null, end: string | null }>({ start: null, end: null })
  const [templateDialog, setTemplateDialog] = useState<{ open: boolean, template: Template | null, error: string | null }>({ open: false, template: null, error: null })
  const [projectSwitchDialog, setProjectSwitchDialog] = useState<{ open: boolean, sandbox: Sandbox | null }>({ open: false, sandbox: null })
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

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
        timeout: data.timeout_sandboxes,
        archived: data.archived_sandboxes,
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
      archived: "destructive",
      starting: "default",
      timeout: "destructive",
    } as const

    const statusTranslations = {
      running: t("table.running") || "Running",
      stopped: t("table.stopped") || "Stopped",
      archived: t("table.archived") || "Archived",
      starting: t("table.starting") || "Starting",
      timeout: t("table.timeout") || "Timeout",
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
    // First filter by active/archived tab
    const matchesTab = activeTab === "active" ? sandbox.status !== "archived" : sandbox.status === "archived"
    
    // Then apply other filters
    const matchesSearch = sandbox.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || sandbox.status === statusFilter
    const matchesDateRange = (!dateRange.from || new Date(sandbox.createdAt) >= new Date(dateRange.from)) &&
                            (!dateRange.to || new Date(sandbox.createdAt) <= new Date(dateRange.to))
    
    return matchesTab && matchesSearch && matchesStatus && matchesDateRange
  }).sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    return 0
  })

  // Calculate stats from actual sandbox data
  const totalSandboxes = sandboxes.length
  const runningSandboxes = sandboxes.filter(s => s.status === "running").length
  const stoppedSandboxes = sandboxes.filter(s => s.status === "stopped").length
  const timeoutSandboxes = sandboxes.filter(s => s.status === "timeout").length
  const archivedSandboxes = sandboxes.filter(s => s.status === "archived").length
  
  // Calculate average CPU and memory usage from active sandboxes
  const runningSandboxesWithMetrics = sandboxes.filter(s => s.status === "running" && s.resources)
  const avgCpuUsage = runningSandboxesWithMetrics.length > 0 
    ? runningSandboxesWithMetrics.reduce((sum, s) => sum + (s.resources.cpu || 0), 0) / runningSandboxesWithMetrics.length
    : 0
  const avgMemoryUsage = runningSandboxesWithMetrics.length > 0
    ? runningSandboxesWithMetrics.reduce((sum, s) => sum + (s.resources.memory || 0), 0) / runningSandboxesWithMetrics.length
    : 0
  
  // Calculate total cost from active sandboxes
  const totalCost = sandboxes.reduce((sum, s) => sum + (s.cost.totalCost || 0), 0)
  
  // Prepare summary cards data based on actual sandbox data
  const summaryCards = [
    {
      title: t("table.totalSandboxes") || "Total Sandboxes",
      value: totalSandboxes,
      icon: <Activity className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.avgCpuUsage") || "Avg CPU Usage",
      value: `${avgCpuUsage.toFixed(1)}%`,
      icon: <Cpu className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.avgMemoryUsage") || "Avg Memory Usage",
      value: `${avgMemoryUsage.toFixed(1)}%`,
      icon: <HardDrive className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.totalCost") || "Total Cost",
      value: `$${totalCost.toFixed(2)}`,
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
    }
  ]

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
      const params: { start_date?: string; end_date?: string } = {}
      if (start) params.start_date = start
      if (end) params.end_date = end
      const data = await SandboxService.getSandboxMetrics(sandboxId, params)
      setMetricsData(data)
    } catch (e) {
      setMetricsData([])
    } finally {
      setMetricsLoading(false)
    }
  }

  // Handler to open template dialog
  const handleOpenTemplateDialog = async (template_id: string) => {
    try {
      const tpl = await templateService.getTemplate(template_id)
      setTemplateDialog({ open: true, template: tpl, error: null })
    } catch (err) {
      setTemplateDialog({ open: true, template: null, error: t("sandbox.templateDeleted") || "The template used to create this sandbox has been deleted." })
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
                </>
              ) : (
                <>
                  <SelectItem value="archived">{t("table.archived") || "Archived"}</SelectItem>
                </>
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

      {/* Tabs for Active/Archived Sandboxes */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as "active" | "archived")
        setStatusFilter("all") // Reset status filter when switching tabs
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            {t("table.active") || "Active"} ({sandboxes.filter(s => s.status !== "archived").length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            {t("table.archived") || "Archived"} ({sandboxes.filter(s => s.status === "archived").length})
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
                  </>
                ) : null}
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
                  <p>{t("sandbox.noArchivedSandboxes") || "No archived sandboxes found."}</p>
              <p className="text-sm mt-2">
                {t("sandbox.noArchivedSandboxesDesc") || "Archived sandboxes will appear here for viewing."}
              </p>
                </>
              )}
            </div>
          ) : (
            <ResizableTable
              defaultColumnWidths={{
                checkbox: 48,
                name: 200,
                status: 100,
                cpu: 100,
                memory: 100,
                uptime: 100,
                created: 120,
                template: 180,
                ...(activeTab === "archived" && { archivedAt: 120 }),
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
                    columnId="project"
                    defaultWidth={150}
                    className="cursor-pointer group"
                    onClick={() => handleSort("project_name")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.project") || "Project"}
                      {getSortIcon("project_name")}
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
                  <ResizableTableHead columnId="template" defaultWidth={180}>
                    {t("sandbox.template") || "Template"}
                  </ResizableTableHead>
                  {activeTab === "archived" && (
                    <ResizableTableHead 
                      columnId="archivedAt"
                      defaultWidth={120}
                      className="cursor-pointer group"
                      onClick={() => handleSort("updatedAt")}
                    >
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {t("table.archived") || "Archived"}
                        {getSortIcon("updatedAt")}
                      </div>
                    </ResizableTableHead>
                  )}
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
                        {sandbox.status === "archived" && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {t("table.readOnly") || "Read-only"}
                          </div>
                        )}
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      {sandbox.project_name || t("sandbox.noProject") || "No Project"}
                    </ResizableTableCell>
                    <ResizableTableCell>
                      {getStatusBadge(sandbox.status)}
                    </ResizableTableCell>
                    <ResizableTableCell>{sandbox.cpu_spec || 0} vCPU</ResizableTableCell>
                    <ResizableTableCell>{sandbox.memory_spec || 0} GB</ResizableTableCell>
                    <ResizableTableCell>{formatUptime(sandbox.uptime)}</ResizableTableCell>
                    <ResizableTableCell>{formatDate(sandbox.createdAt)}</ResizableTableCell>
                    <ResizableTableCell>
                      <button className="underline text-blue-600 hover:text-blue-800" onClick={() => handleOpenTemplateDialog(sandbox.template_id)}>
                        {sandbox.template_id ? (sandbox.template_name || t("sandbox.loadingTemplate") || "Loading...") : t("sandbox.deletedTemplate")}
                      </button>
                    </ResizableTableCell>
                    {activeTab === "archived" && (
                      <ResizableTableCell>
                        <div className="text-sm text-muted-foreground">
                          {t("table.archived") || "Archived"}: {formatDate(sandbox.updatedAt)}
                        </div>
                      </ResizableTableCell>
                    )}
                    <ResizableTableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMetricsDialog(sandbox)}
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        {activeTab === "active" && (
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
                          </>
                        )}
                        {sandbox.status !== "archived" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setProjectSwitchDialog({ open: true, sandbox: { ...sandbox, project_id: "" } })
                                  setProjectsLoading(true)
                                  new ProjectService().getProjects().then(res => {
                                    setAvailableProjects(res.projects.filter(p => p.project_id !== sandbox.project_id))
                                    setProjectsLoading(false)
                                  }).catch(error => {
                                    console.error("Error loading projects:", error)
                                    setAvailableProjects([])
                                    setProjectsLoading(false)
                                  })
                                }}
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("action.switchProject") || "Switch Project"}</p>
                            </TooltipContent>
                          </Tooltip>
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
                  <ChartTooltip labelFormatter={(v: any) => new Date(v).toLocaleString()} />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setMetricsDialog({ open: false, sandbox: null })}>
              {t("action.close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={templateDialog.open} onOpenChange={open => setTemplateDialog({ open, template: null, error: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {templateDialog.error ? t("sandbox.deletedTemplate") : templateDialog.template?.name}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {templateDialog.error ? (
              <span className="text-destructive">{templateDialog.error}</span>
            ) : (
              <>
                <span>{templateDialog.template?.description}</span>
                <span className="mt-2 text-xs text-muted-foreground block">{t("admin.language")}: {templateDialog.template?.language}</span>
                <span className="mt-2 text-xs text-muted-foreground block">{t("admin.category")}: {templateDialog.template?.category}</span>
                <span className="mt-2 text-xs text-muted-foreground block">{t("admin.cpu")}: {templateDialog.template?.cpu_spec}</span>
                <span className="mt-2 text-xs text-muted-foreground block">{t("admin.ram")}: {templateDialog.template?.memory_spec} GB</span>
              </>
            )}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action.close") || "Close"}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={projectSwitchDialog.open} onOpenChange={open => setProjectSwitchDialog({ open, sandbox: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("action.switchProject") || "Switch Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Select
                value={projectSwitchDialog.sandbox?.project_id || ""}
                onValueChange={val => {
                  if (projectSwitchDialog.sandbox) {
                    setProjectSwitchDialog({ ...projectSwitchDialog, sandbox: { ...projectSwitchDialog.sandbox, project_id: val } })
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("project.selectProject") || "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                  {projectsLoading ? (
                    <SelectItem value="loading" disabled>{t("project.loadingProjects") || "Loading projects..."}</SelectItem>
                  ) : availableProjects.length === 0 ? (
                    <SelectItem value="no-projects" disabled>{t("project.noProjectsAvailable") || "No other projects available"}</SelectItem>
                  ) : (
                    availableProjects.map(project => (
                      <SelectItem key={project.project_id} value={project.project_id}>{project.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProjectSwitchDialog({ open: false, sandbox: null })}
            >
              {t("action.cancel") || "Cancel"}
            </Button>
            <Button
              disabled={projectsLoading || !projectSwitchDialog.sandbox || !projectSwitchDialog.sandbox.project_id || availableProjects.length === 0}
              onClick={async () => {
                if (!projectSwitchDialog.sandbox || availableProjects.length === 0) return
                await SandboxService.switchSandboxProject(projectSwitchDialog.sandbox.id, projectSwitchDialog.sandbox.project_id)
                setProjectSwitchDialog({ open: false, sandbox: null })
                setLoading(true)
                await loadSandboxes()
              }}
            >
              {t("action.confirm") || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </PageLayout>
  )
}

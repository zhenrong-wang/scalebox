"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Play, Square, Trash2, Eye, Download, Server, DollarSign, Cpu, MemoryStick } from "lucide-react"
import { SandboxService } from "../../services/sandbox-service"
import type { Sandbox, SandboxFilters } from "../../types/sandbox"
import { SandboxFiltersPanel } from "./sandbox-filters-panel"
import { SandboxDetailsModal } from "./sandbox-details-modal"
import { useLanguage } from "../../contexts/language-context"

export function SandboxManagement() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([])
  const [filteredSandboxes, setFilteredSandboxes] = useState<Sandbox[]>([])
  const [selectedSandbox, setSelectedSandbox] = useState<Sandbox | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "created" | "cost" | "status">("created")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const [filters, setFilters] = useState<SandboxFilters>({
    status: [],
    framework: [],
    region: [],
    visibility: [],
    user: "",
    dateRange: { from: null, to: null },
    search: "",
  })

  const { t } = useLanguage()

  // Load sandboxes on component mount
  useEffect(() => {
    const allSandboxes = SandboxService.getAllSandboxes()
    setSandboxes(allSandboxes)
  }, [])

  // Apply filters and search
  useEffect(() => {
    const searchFilters = { ...filters, search: searchTerm }
    // Local filtering logic
    let filtered = sandboxes.filter((sb) => {
      // Status filter
      if (filters.status.length && !filters.status.includes(sb.status)) return false
      // Framework filter
      if (filters.framework.length && !filters.framework.includes(sb.framework)) return false
      // Region filter
      if (filters.region.length && !filters.region.includes(sb.region)) return false
      // Visibility filter
      if (filters.visibility.length && !filters.visibility.includes(sb.visibility)) return false
      // User filter
      if (filters.user && !sb.userName.toLowerCase().includes(filters.user.toLowerCase())) return false
      // Date range filter
      if (filters.dateRange.from && new Date(sb.createdAt) < new Date(filters.dateRange.from)) return false
      if (filters.dateRange.to && new Date(sb.createdAt) > new Date(filters.dateRange.to)) return false
      // Search filter
      if (searchTerm && !(
        sb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sb.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sb.framework.toLowerCase().includes(searchTerm.toLowerCase())
      )) return false
      return true
    })

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "created":
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case "cost":
          aValue = a.cost.totalCost
          bValue = b.cost.totalCost
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
    setFilteredSandboxes(sorted)
  }, [sandboxes, filters, searchTerm, sortBy, sortOrder])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredSandboxes.length
    const running = filteredSandboxes.filter((sb) => sb.status === "running").length
    const stopped = filteredSandboxes.filter((sb) => sb.status === "stopped").length
    const errored = filteredSandboxes.filter((sb) => sb.status === "error").length
    const deleted = filteredSandboxes.filter((sb) => sb.status === "deleted").length
    const totalCost = filteredSandboxes.reduce((sum, sb) => sum + (sb.cost?.totalCost || 0), 0)
    const avgCpu = filteredSandboxes.length ? Math.round(filteredSandboxes.reduce((sum, sb) => sum + (sb.resources?.cpu || 0), 0) / filteredSandboxes.length) : 0
    const avgMemory = filteredSandboxes.length ? Math.round(filteredSandboxes.reduce((sum, sb) => sum + (sb.resources?.memory || 0), 0) / filteredSandboxes.length) : 0
    return { total, running, stopped, errored, deleted, totalCost, avgCpu, avgMemory }
  }, [filteredSandboxes])

  const handleSandboxAction = (sandboxId: string, action: "start" | "stop" | "delete") => {
    let newStatus: Sandbox["status"]

    switch (action) {
      case "start":
        newStatus = "running"
        break
      case "stop":
        newStatus = "stopped"
        break
      case "delete":
        newStatus = "deleted"
        break
    }

    SandboxService.updateSandbox(sandboxId, { status: newStatus })
    // Refresh sandboxes
    const updatedSandboxes = SandboxService.getAllSandboxes()
    setSandboxes(updatedSandboxes)
  }

  const getStatusBadge = (status: Sandbox["status"]) => {
    const variants = {
      running: "default",
      stopped: "secondary",
      deleted: "destructive",
      error: "destructive",
    } as const

    const colors = {
      running: "bg-green-100 text-green-800 border-green-200",
      stopped: "bg-gray-100 text-gray-800 border-gray-200",
      deleted: "bg-red-100 text-red-800 border-red-200",
      error: "bg-red-100 text-red-800 border-red-200",
    }

    return <Badge className={colors[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
  }

  const getFrameworkBadge = (framework: string) => {
    const colors = {
      React: "bg-blue-100 text-blue-800 border-blue-200",
      Vue: "bg-green-100 text-green-800 border-green-200",
      Angular: "bg-red-100 text-red-800 border-red-200",
      "Node.js": "bg-yellow-100 text-yellow-800 border-yellow-200",
      Python: "bg-purple-100 text-purple-800 border-purple-200",
      "Next.js": "bg-gray-100 text-gray-800 border-gray-200",
    }

    return (
      <Badge className={colors[framework as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"}>
        {framework}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            {t("admin.monitorAndManageAllSandboxes")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("admin.export")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.totalSandboxes")}
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {t("admin.running")}: {stats.running}, {t("admin.stopped")}: {stats.stopped}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.totalCost")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              {t("admin.acrossAllSandboxes")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.avgCpuUsage")}
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCpu.toFixed(1)}%</div>
            <Progress value={stats.avgCpu} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.avgMemoryUsage")}
            </CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgMemory.toFixed(1)}%</div>
            <Progress value={stats.avgMemory} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {t("admin.sandboxList")}
              </CardTitle>
              <CardDescription>
                {filteredSandboxes.length} {t("admin.of")} {sandboxes.length} {t("admin.sandboxes")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.searchSandboxes")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsFiltersOpen(!isFiltersOpen)}>
                <Filter className="h-4 w-4 mr-2" />
                {t("admin.filters")}
              </Button>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">{t("admin.createdDate")}</SelectItem>
                  <SelectItem value="name">{t("admin.name")}</SelectItem>
                  <SelectItem value="cost">{t("admin.cost")}</SelectItem>
                  <SelectItem value="status">{t("admin.status")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isFiltersOpen && (
            <div className="mb-4">
              <SandboxFiltersPanel
                filters={filters}
                onFiltersChange={setFilters}
                onClose={() => setIsFiltersOpen(false)}
              />
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.name")}</TableHead>
                  <TableHead>{t("admin.framework")}</TableHead>
                  <TableHead>{t("admin.status")}</TableHead>
                  <TableHead>{t("admin.user")}</TableHead>
                  <TableHead>{t("admin.resources")}</TableHead>
                  <TableHead>{t("admin.cost")}</TableHead>
                  <TableHead>{t("admin.created")}</TableHead>
                  <TableHead className="text-right">
                    {t("admin.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSandboxes.map((sandbox) => (
                  <TableRow key={sandbox.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sandbox.name}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {sandbox.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getFrameworkBadge(sandbox.framework)}</TableCell>
                    <TableCell>{getStatusBadge(sandbox.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sandbox.userName}</div>
                        <div className="text-sm text-muted-foreground">
                          {sandbox.userEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span>{t("admin.cpu")}:</span>
                          <Progress value={sandbox.resources.cpu} className="w-16 h-2" />
                          <span className="text-xs">{sandbox.resources.cpu}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>{t("admin.ram")}:</span>
                          <Progress value={sandbox.resources.memory} className="w-16 h-2" />
                          <span className="text-xs">{sandbox.resources.memory}%</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatCurrency(sandbox.cost.totalCost)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(sandbox.cost.hourlyRate)}/{t("admin.hr")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(sandbox.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSandbox(sandbox)
                            setIsDetailsModalOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {sandbox.status === "stopped" && (
                          <Button variant="ghost" size="sm" onClick={() => handleSandboxAction(sandbox.id, "start")}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {sandbox.status === "running" && (
                          <Button variant="ghost" size="sm" onClick={() => handleSandboxAction(sandbox.id, "stop")}>
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        {sandbox.status !== "deleted" && (
                          <Button variant="ghost" size="sm" onClick={() => handleSandboxAction(sandbox.id, "delete")}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredSandboxes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">
                {t("admin.noSandboxesFound")}
              </div>
              <div>{t("admin.tryAdjustingSearchOrFilterCriteria")}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sandbox Details Modal */}
      {selectedSandbox && (
        <SandboxDetailsModal
          sandbox={selectedSandbox}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false)
            setSelectedSandbox(null)
          }}
        />
      )}
    </div>
  )
}

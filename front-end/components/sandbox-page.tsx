"use client"

import { useState, useEffect } from "react"
import { Play, Square, Trash2, BarChart3, Plus, Search, Filter, MoreHorizontal, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLanguage } from "../contexts/language-context"
import { tReplace } from "../lib/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Sandbox {
  id: string
  name: string
  description?: string
  status: "running" | "stopped"
  cpu: string
  memory: string
  uptime: string
  created: string
  projectId?: string
  projectName?: string
}

const mockSandboxes: Sandbox[] = [
  {
    id: "sb-001",
    name: "Web Development",
    description: "Frontend development environment with React and TypeScript",
    status: "running",
    cpu: "2.4%",
    memory: "512MB",
    uptime: "2h 15m",
    created: "2024-01-15",
    projectId: "proj_001",
    projectName: "E-commerce Platform",
  },
  {
    id: "sb-002",
    name: "API Testing",
    description: "Backend API testing and development environment",
    status: "stopped",
    cpu: "0%",
    memory: "0MB",
    uptime: "0m",
    created: "2024-01-10",
    projectId: "proj_002",
    projectName: "Mobile App Backend",
  },
  {
    id: "sb-003",
    name: "Data Processing",
    description: "Data analysis and processing pipeline",
    status: "running",
    cpu: "15.7%",
    memory: "1.2GB",
    uptime: "45m",
    created: "2024-01-08",
    projectId: "proj_001",
    projectName: "E-commerce Platform",
  },
  {
    id: "sb-004",
    name: "Machine Learning",
    description: "ML model training and experimentation environment",
    status: "running",
    cpu: "8.3%",
    memory: "2.1GB",
    uptime: "1h 30m",
    created: "2024-01-05",
    projectId: "proj_003",
    projectName: "Analytics Dashboard",
  },
  {
    id: "sb-005",
    name: "Database Testing",
    description: "Database performance testing and optimization",
    status: "stopped",
    cpu: "0%",
    memory: "0MB",
    uptime: "0m",
    created: "2024-01-03",
  },
]

export function SandboxPage() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>(mockSandboxes)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  // Define columns with type safety
  const { t } = useLanguage()
  const columns: Array<{ key: keyof Sandbox | 'manage'; label: string; sortable?: boolean }> = [
    { key: "name", label: t("table.name"), sortable: true },
    { key: "status", label: t("table.status"), sortable: true },
    { key: "cpu", label: t("table.cpu"), sortable: true },
    { key: "memory", label: t("table.memory"), sortable: true },
    { key: "uptime", label: t("table.uptime"), sortable: true },
    { key: "created", label: t("table.created"), sortable: true },
    { key: "projectName", label: t("table.project"), sortable: true },
    { key: "manage", label: t("table.manage"), sortable: false },
  ]
  // Only allow sortBy to be a real Sandbox key
  const [sortBy, setSortBy] = useState<keyof Sandbox | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [colWidths, setColWidths] = useState<number[]>([180, 120, 100, 120, 120, 120, 150, 200])
  const tableRef = useRef<HTMLTableElement>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; sandbox: Sandbox | null }>({ open: false, sandbox: null })
  const [batchDeleteDialog, setBatchDeleteDialog] = useState(false)
  const [batchStopDialog, setBatchStopDialog] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [assignProjectDialog, setAssignProjectDialog] = useState<{ open: boolean; sandbox: Sandbox | null }>({ open: false, sandbox: null })
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")

  // Mock projects for assignment
  const mockProjects = [
    { id: "proj_001", name: "E-commerce Platform" },
    { id: "proj_002", name: "Mobile App Backend" },
    { id: "proj_003", name: "Analytics Dashboard" },
    { id: "default", name: "Default" },
  ]

  let filteredSandboxes = sandboxes.filter((sandbox) => {
    const matchesSearch = sandbox.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || sandbox.status === statusFilter
    const matchesProject = projectFilter === "all" || 
          (projectFilter === "default" && !sandbox.projectId) ||
    (projectFilter !== "default" && sandbox.projectId === projectFilter)
    return matchesSearch && matchesStatus && matchesProject
  })

  if (sortBy) {
    filteredSandboxes = [...filteredSandboxes].sort((a, b) => {
      const aVal = a[sortBy] || ""
      const bVal = b[sortBy] || ""
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }

  const isAllSelected = selected.length > 0 && selected.length === filteredSandboxes.length
  const isIndeterminate = selected.length > 0 && selected.length < filteredSandboxes.length

  useEffect(() => {
    if (tableRef.current) {
      const selectAllCheckbox = tableRef.current.querySelector('input[type="checkbox"]');
      if (selectAllCheckbox) {
        (selectAllCheckbox as HTMLInputElement).indeterminate = isIndeterminate;
      }
    }
  }, [isIndeterminate]);

  const closeDeleteDialog = () => setDeleteDialog({ open: false, sandbox: null })
  const confirmDelete = () => {
    if (deleteDialog.sandbox) {
      setSandboxes((prev) => prev.filter((sb) => sb.id !== deleteDialog.sandbox!.id))
      closeDeleteDialog()
    }
  }
  const handleBatchStop = () => {
    setSandboxes((prev) => prev.map((sb) => selected.includes(sb.id) && sb.status === "running" ? { ...sb, status: "stopped", cpu: "0%", memory: "0MB", uptime: "0m" } : sb))
    setSelected([])
    setBatchStopDialog(false)
  }

  const handleSort = (col: keyof Sandbox | 'manage') => {
    if (col === 'manage') return;
    setSortBy(col)
    setSortDir(sortBy === col && sortDir === 'asc' ? 'desc' : 'asc')
  }

  const startResize = (idx: number, e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = colWidths[idx]
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      setColWidths((widths) => {
        const newWidths = [...widths]
        newWidths[idx] = Math.max(60, startWidth + delta)
        return newWidths
      })
    }
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  const handleStop = (id: string) => {
    setSandboxes((prev) =>
      prev.map((sb) =>
        sb.id === id ? { ...sb, status: "stopped" as const, cpu: "0%", memory: "0MB", uptime: "0m" } : sb,
      ),
    )
  }

  const handleStart = (id: string) => {
    setSandboxes((prev) =>
      prev.map((sb) =>
        sb.id === id ? { ...sb, status: "running" as const, cpu: "1.2%", memory: "256MB", uptime: "0m" } : sb,
      ),
    )
  }

  const handleDelete = (id: string) => {
    setSandboxes((prev) => prev.filter((sb) => sb.id !== id))
  }

  const handleAssignProject = (sandboxId: string, projectId: string) => {
    const project = mockProjects.find(p => p.id === projectId)
    setSandboxes((prev) =>
      prev.map((sb) =>
        sb.id === sandboxId 
          ? { 
              ...sb, 
                    projectId: projectId === "default" ? undefined : projectId,
      projectName: projectId === "default" ? undefined : project?.name
            } 
          : sb
      )
    )
    setAssignProjectDialog({ open: false, sandbox: null })
    setSelectedProjectId("")
  }

  const openAssignProjectDialog = (sandbox: Sandbox) => {
    setAssignProjectDialog({ open: true, sandbox })
    setSelectedProjectId(sandbox.projectId || "default")
  }

  const runningSandboxes = sandboxes.filter((sb) => sb.status === "running").length
  const totalSandboxes = sandboxes.length

  const toggleSelectAll = () => {
    if (isAllSelected) setSelected([])
    else setSelected(filteredSandboxes.map((sb) => sb.id))
  }
  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id])
  }
  const handleBatchDelete = () => {
    setSandboxes((prev) => prev.filter((sb) => !selected.includes(sb.id)))
    setSelected([])
    setBatchDeleteDialog(false)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{totalSandboxes}</div>
          <div className="text-sm text-muted-foreground">{t("table.totalSandboxes") || "Total Sandboxes"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600 text-foreground">{runningSandboxes}</div>
          <div className="text-sm text-muted-foreground">{t("table.running") || "Running"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{totalSandboxes - runningSandboxes}</div>
          <div className="text-sm text-muted-foreground">{t("table.stopped") || "Stopped"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {t("action.createSandbox")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex gap-4 items-center">
          <div className="relative" style={{ maxWidth: 320, flex: '0 1 auto' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("sandbox.search") || "Search sandboxes..."}
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
              <SelectItem value="running">{t("table.running") || "Running"}</SelectItem>
              <SelectItem value="stopped">{t("table.stopped") || "Stopped"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40">
              <FolderOpen className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              {mockProjects.filter(p => p.id !== "default").map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sandboxes Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("table.sandboxes") || "Sandboxes"}</CardTitle>
            <CardDescription>
              {filteredSandboxes.length} {t("table.sandboxes") || "sandboxes"} found
            </CardDescription>
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selected.length} {selected.length === 1 ? t("table.sandbox") || "sandbox" : t("table.sandboxes") || "sandboxes"} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSandboxes((prev) =>
                    prev.map((sb) =>
                      selected.includes(sb.id) && sb.status === "stopped"
                        ? { ...sb, status: "running" as const, cpu: "1.2%", memory: "256MB", uptime: "0m" }
                        : sb,
                    ),
                  )
                  setSelected([])
                }}
                disabled={!selected.every(id => sandboxes.find(sb => sb.id === id)?.status === "stopped")}
              >
                <Play className="h-4 w-4 mr-2" />
                {t("action.start") || "Start"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchStopDialog(true)}
                disabled={!selected.every(id => sandboxes.find(sb => sb.id === id)?.status === "running")}
              >
                <Square className="h-4 w-4 mr-2" />
                {t("action.stop") || "Stop"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBatchDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("action.delete") || "Delete"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table ref={tableRef}>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: 40, minWidth: 40 }}>
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                {columns.map((col, idx) => (
                  <TableHead
                    key={col.key}
                    style={{ width: colWidths[idx], minWidth: 60, position: "relative", userSelect: "none", cursor: col.sortable ? "pointer" : undefined }}
                    onClick={col.sortable ? () => handleSort(col.key as keyof Sandbox) : undefined}
                    className={col.key === "manage" ? "text-right" : ""}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {col.sortable && sortBy === col.key && (
                        <span className="ml-1">{sortDir === "asc" ? <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2l3 4H2z" fill="currentColor"/></svg> : <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 8l3-4H2z" fill="currentColor"/></svg>}</span>
                      )}
                    </span>
                    {idx < colWidths.length - 1 && (
                      <span
                        onMouseDown={(e) => startResize(idx, e)}
                        style={{ position: "absolute", right: 0, top: 0, height: "100%", width: 6, cursor: "col-resize", zIndex: 10 }}
                      >
                        <span style={{ display: "block", width: 2, height: "100%", background: "#e5e7eb" }} />
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSandboxes.map((sandbox) => (
                <TableRow key={sandbox.id} className="hover:bg-accent">
                  <TableCell style={{ width: 40, minWidth: 40 }}>
                    <Checkbox
                      checked={selected.includes(sandbox.id)}
                      onCheckedChange={() => toggleSelect(sandbox.id)}
                    />
                  </TableCell>
                  <TableCell style={{ width: colWidths[0], minWidth: 60 }}>
                  <div>
                    <div className="font-medium">{sandbox.name}</div>
                    <div className="text-sm text-muted-foreground max-w-xs truncate">{sandbox.description || "No description"}</div>
                  </div>
                </TableCell>
                  <TableCell style={{ width: colWidths[1], minWidth: 60 }}>
                    <Badge
                      variant={sandbox.status === "running" ? "default" : "secondary"}
                      className={sandbox.status === "running" ? "bg-green-100 text-green-800" : ""}
                    >
                      {t(`table.${sandbox.status}`) || sandbox.status}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ width: colWidths[2], minWidth: 60 }}>{sandbox.cpu}</TableCell>
                  <TableCell style={{ width: colWidths[3], minWidth: 60 }}>{sandbox.memory}</TableCell>
                  <TableCell style={{ width: colWidths[4], minWidth: 60 }}>{sandbox.uptime}</TableCell>
                  <TableCell style={{ width: colWidths[5], minWidth: 60 }}>{sandbox.created}</TableCell>
                                  <TableCell style={{ width: colWidths[6], minWidth: 60 }}>
                  {sandbox.projectName ? (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{sandbox.projectName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-muted-foreground">Default</span>
                    </div>
                  )}
                </TableCell>
                  <TableCell style={{ width: colWidths[7], minWidth: 60 }} className="pl-2 flex gap-2 items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => alert(t("action.metrics") + " for " + sandbox.name)}>
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("action.metrics")}</TooltipContent>
                      </Tooltip>
                      {sandbox.status === "running" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleStop(sandbox.id)}>
                              <Square className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("action.stop")}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleStart(sandbox.id)}>
                              <Play className="h-4 w-4 text-green-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("action.start")}</TooltipContent>
                        </Tooltip>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openAssignProjectDialog(sandbox)}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {sandbox.projectId ? "Switch Project" : "Add to Project"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, sandbox })}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("action.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tReplace(t("dialog.delete.title"), { itemType: t("table.sandbox") || "Sandbox" })}</DialogTitle>
            <DialogDescription>
              {tReplace(t("dialog.delete.desc"), { itemType: t("table.sandbox") || "sandbox" })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={closeDeleteDialog}>{t("action.cancel")}</Button>
            <Button variant="destructive" onClick={confirmDelete}>{t("action.delete")}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={batchDeleteDialog} onOpenChange={setBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tReplace(t("dialog.delete.batch.title"), { itemType: t("table.sandbox") || "Sandboxes" })}</DialogTitle>
            <DialogDescription>
              {tReplace(t("dialog.delete.batch.desc"), { count: selected.length, itemType: t("table.sandbox") || "sandboxes" })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setBatchDeleteDialog(false)}>{t("action.cancel")}</Button>
            <Button variant="destructive" onClick={handleBatchDelete}>{t("action.delete")}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Batch Stop Confirmation Dialog */}
      <Dialog open={batchStopDialog} onOpenChange={setBatchStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tReplace(t("dialog.delete.batch.stop.title"), { itemType: t("table.sandbox") || "Sandboxes" })}</DialogTitle>
            <DialogDescription>
              {tReplace(t("dialog.delete.batch.stop.desc"), { itemType: t("table.sandbox") || "sandboxes" })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setBatchStopDialog(false)}>{t("action.cancel")}</Button>
            <Button variant="secondary" onClick={handleBatchStop}>{t("action.stop")}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Project Assignment Dialog */}
      <Dialog open={assignProjectDialog.open} onOpenChange={(open) => setAssignProjectDialog({ open, sandbox: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assignProjectDialog.sandbox?.projectId ? "Switch Project" : "Add to Project"}
            </DialogTitle>
            <DialogDescription>
              Select a project for "{assignProjectDialog.sandbox?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {mockProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssignProjectDialog({ open: false, sandbox: null })}>
                {t("action.cancel")}
              </Button>
              <Button onClick={() => handleAssignProject(assignProjectDialog.sandbox!.id, selectedProjectId)}>
                {assignProjectDialog.sandbox?.projectId ? "Switch" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

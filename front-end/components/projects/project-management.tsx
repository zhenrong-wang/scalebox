"use client"

import { useState } from "react"
import { Plus, Search, Filter, FolderOpen, Settings, Trash2, Edit, Box, DollarSign, Eye } from "lucide-react"
import { SortIndicator } from "@/components/ui/sort-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResizableTable, ResizableTableHead, ResizableTableCell } from "@/components/ui/resizable-table"
import { PageLayout } from "@/components/ui/page-layout"
import { useLanguage } from "../../contexts/language-context"

interface Project {
  id: string
  name: string
  description: string
  sandboxCount: number
  apiKeyCount: number
  totalSpent: number
  createdAt: string
  updatedAt: string
  status: "active" | "archived"
}

const mockProjects: Project[] = [
  {
    id: "proj_001",
    name: "E-commerce Platform",
    description: "Main e-commerce application with microservices architecture",
    sandboxCount: 5,
    apiKeyCount: 3,
    totalSpent: 245.3,
    createdAt: "2024-01-15",
    updatedAt: "2024-01-28",
    status: "active",
  },
  {
    id: "proj_002",
    name: "Mobile App Backend",
    description: "REST API backend for mobile application",
    sandboxCount: 2,
    apiKeyCount: 1,
    totalSpent: 89.2,
    createdAt: "2024-01-20",
    updatedAt: "2024-01-27",
    status: "active",
  },
  {
    id: "proj_003",
    name: "Analytics Dashboard",
    description: "Internal analytics and reporting dashboard",
    sandboxCount: 1,
    apiKeyCount: 2,
    totalSpent: 156.75,
    createdAt: "2024-01-10",
    updatedAt: "2024-01-25",
    status: "archived",
  },
]

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [viewSandboxesDialog, setViewSandboxesDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
  })
  const [editDialog, setEditDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
  const [editProject, setEditProject] = useState({
    name: "",
    description: "",
  })
  const { t } = useLanguage()

  // Mock sandboxes data for demonstration
  const mockSandboxes = [
    { id: "sb-001", name: "Web Development", status: "running", projectId: "proj_001" },
    { id: "sb-002", name: "API Testing", status: "stopped", projectId: "proj_002" },
    { id: "sb-003", name: "Data Processing", status: "running", projectId: "proj_001" },
    { id: "sb-004", name: "Machine Learning", status: "running", projectId: "proj_003" },
    { id: "sb-005", name: "Database Testing", status: "stopped" },
  ]

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: string) => {
    return (
      <SortIndicator
        isSorted={sortField === field}
        sortDirection={sortField === field ? sortDirection : undefined}
      />
    )
  }

  const filteredAndSortedProjects = projects
    .filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || project.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (!sortField) return 0
      
      let aValue = a[sortField as keyof Project] || ""
      let bValue = b[sortField as keyof Project] || ""
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

  const handleCreateProject = () => {
    if (!newProject.name.trim() || !newProject.description.trim()) return

    const project: Project = {
      id: `proj_${Date.now()}`,
      name: newProject.name,
      description: newProject.description,
      sandboxCount: 0,
      apiKeyCount: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      status: "active",
    }

    setProjects([project, ...projects])
    setNewProject({ name: "", description: "" })
    setIsCreateDialogOpen(false)
  }

  const handleEditProject = () => {
    if (!editDialog.project || !editProject.name.trim() || !editProject.description.trim()) return

    setProjects(prev => prev.map(project => 
      project.id === editDialog.project!.id 
        ? {
            ...project,
            name: editProject.name,
            description: editProject.description,
            updatedAt: new Date().toISOString().split("T")[0],
          }
        : project
    ))
    setEditDialog({ open: false, project: null })
    setEditProject({ name: "", description: "" })
  }

  const openEditDialog = (project: Project) => {
    setEditProject({
      name: project.name,
      description: project.description,
    })
    setEditDialog({ open: true, project })
  }

  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter((p) => p.id !== projectId))
  }

  const handleArchiveProject = (projectId: string) => {
    setProjects(projects.map((p) => (p.id === projectId ? { ...p, status: "archived" as const } : p)))
  }

  const getProjectSandboxes = (projectId: string) => {
    return mockSandboxes.filter(sb => sb.projectId === projectId)
  }

  const openViewSandboxes = (project: Project) => {
    setViewSandboxesDialog({ open: true, project })
  }

  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === "active").length
  const totalSandboxes = projects.reduce((sum, p) => sum + p.sandboxCount, 0)
  const totalSpent = projects.reduce((sum, p) => sum + p.totalSpent, 0)

  // Prepare summary cards data
  const summaryCards = [
    {
      title: t("table.totalProjects") || "Total Projects",
      value: totalProjects,
      icon: <FolderOpen className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.activeProjects") || "Active Projects",
      value: activeProjects,
      icon: <Box className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.totalSandboxes") || "Total Sandboxes",
      value: totalSandboxes,
      icon: <Settings className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t("table.totalSpent") || "Total Spent",
      value: `$${totalSpent.toFixed(2)}`,
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
    }
  ]

  return (
    <PageLayout
      header={{
        description: t("project.description") || "Manage your development projects",
        children: (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("action.createProject") || "Create Project"}
          </Button>
        )
      }}
      summaryCards={summaryCards}
    >
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("project.search") || "Search projects..."}
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
                  <SelectItem value="active">{t("table.active") || "Active"}</SelectItem>
                  <SelectItem value="archived">{t("table.archived") || "Archived"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardContent>
          {filteredAndSortedProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("project.noProjects") || "No projects found."}</p>
              <p className="text-sm mt-2">
                {t("project.createFirst") || "Create your first project to get started."}
              </p>
            </div>
          ) : (
            <ResizableTable
              defaultColumnWidths={{
                name: 200,
                description: 250,
                sandboxes: 120,
                apiKeys: 100,
                totalSpent: 120,
                status: 100,
                created: 120,
                actions: 120
              }}
            >
              <TableHeader>
                <TableRow>
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
                  <ResizableTableHead columnId="description" defaultWidth={250}>
                    {t("table.description") || "Description"}
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="sandboxes"
                    defaultWidth={120}
                    className="cursor-pointer group"
                    onClick={() => handleSort("sandboxCount")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.sandboxes") || "Sandboxes"}
                      {getSortIcon("sandboxCount")}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="apiKeys"
                    defaultWidth={100}
                    className="cursor-pointer group"
                    onClick={() => handleSort("apiKeyCount")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.apiKeys") || "API Keys"}
                      {getSortIcon("apiKeyCount")}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="totalSpent"
                    defaultWidth={120}
                    className="cursor-pointer group"
                    onClick={() => handleSort("totalSpent")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.totalSpent") || "Total Spent"}
                      {getSortIcon("totalSpent")}
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
                  <ResizableTableHead 
                    columnId="created"
                    defaultWidth={120}
                    className="cursor-pointer group"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-1">
                      {t("table.created") || "Created"}
                      {getSortIcon("createdAt")}
                    </div>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="actions" defaultWidth={120}>
                    {t("table.actions") || "Actions"}
                  </ResizableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProjects.map((project) => (
                  <TableRow key={project.id}>
                    <ResizableTableCell>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-muted-foreground">{project.id}</div>
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell className="break-words">{project.description}</ResizableTableCell>
                    <ResizableTableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewSandboxes(project)}
                        className="h-auto p-0"
                      >
                        {project.sandboxCount} {t("table.sandboxes") || "sandboxes"}
                      </Button>
                    </ResizableTableCell>
                    <ResizableTableCell>{project.apiKeyCount}</ResizableTableCell>
                    <ResizableTableCell>${project.totalSpent.toFixed(2)}</ResizableTableCell>
                    <ResizableTableCell>
                      <Badge variant={project.status === "active" ? "default" : "secondary"}>
                        {project.status === "active" ? t("table.active") || "Active" : t("table.archived") || "Archived"}
                      </Badge>
                    </ResizableTableCell>
                    <ResizableTableCell>{new Date(project.createdAt).toLocaleDateString()}</ResizableTableCell>
                    <ResizableTableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(project)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t("action.edit") || "Edit"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openViewSandboxes(project)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t("action.viewSandboxes") || "View Sandboxes"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleArchiveProject(project.id)}
                            className={project.status === "active" ? "" : "hidden"}
                          >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {t("action.archive") || "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("action.delete") || "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ResizableTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>
          )}
        </CardContent>
      </Card>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("project.createProject") || "Create New Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">{t("table.name") || "Name"}</Label>
              <Input
                id="project-name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder={t("project.namePlaceholder") || "Enter project name"}
              />
            </div>
            <div>
              <Label htmlFor="project-description">{t("table.description") || "Description"}</Label>
              <Textarea
                id="project-description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder={t("project.descriptionPlaceholder") || "Enter project description"}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t("action.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleCreateProject}>
              {t("action.create") || "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, project: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("project.editProject") || "Edit Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-project-name">{t("table.name") || "Name"}</Label>
              <Input
                id="edit-project-name"
                value={editProject.name}
                onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                placeholder={t("project.namePlaceholder") || "Enter project name"}
              />
            </div>
            <div>
              <Label htmlFor="edit-project-description">{t("table.description") || "Description"}</Label>
              <Textarea
                id="edit-project-description"
                value={editProject.description}
                onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                placeholder={t("project.descriptionPlaceholder") || "Enter project description"}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialog({ open: false, project: null })}>
              {t("action.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleEditProject}>
              {t("action.save") || "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Sandboxes Dialog */}
      <Dialog open={viewSandboxesDialog.open} onOpenChange={(open) => setViewSandboxesDialog({ open, project: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {viewSandboxesDialog.project?.name} - {t("table.sandboxes") || "Sandboxes"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {getProjectSandboxes(viewSandboxesDialog.project?.id || "").length} sandboxes in this project
            </p>
            <div className="space-y-2">
              {getProjectSandboxes(viewSandboxesDialog.project?.id || "").map((sandbox) => (
                <div key={sandbox.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{sandbox.name}</div>
                    <div className="text-sm text-muted-foreground">{sandbox.id}</div>
                  </div>
                  <Badge variant={sandbox.status === "running" ? "default" : "secondary"}>
                    {sandbox.status}
                  </Badge>
                </div>
              ))}
            </div>
            {getProjectSandboxes(viewSandboxesDialog.project?.id || "").length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                {t("project.noSandboxes") || "No sandboxes in this project"}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

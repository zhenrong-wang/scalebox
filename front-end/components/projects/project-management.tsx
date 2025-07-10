"use client"

import { useState } from "react"
import { Plus, Search, Filter, FolderOpen, Settings, Trash2, Edit, Box, DollarSign, Eye, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
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
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("table.totalProjects") || "Total Projects"}</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">{activeProjects} {t("table.active")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("table.totalSandboxes") || "Total Sandboxes"}</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSandboxes}</div>
            <p className="text-xs text-muted-foreground">{t("table.acrossAllProjects") || "Across all projects"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("table.totalSpent")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{t("table.allProjects") || "All projects"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-center h-full">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("action.createProject")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("action.createProject")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="projectName">{t("table.name")}</Label>
                    <Input
                      id="projectName"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder={t("table.name")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectDescription">{t("table.description") || "Description"}</Label>
                    <Textarea
                      id="projectDescription"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder={t("table.description") || "Describe your project"}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleCreateProject} className="w-full">
                    {t("action.createProject")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex gap-4 items-center">
          <div className="relative" style={{ maxWidth: 320, flex: '0 1 auto' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("project.search") || "Search projects..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-xs"
              style={{ minWidth: 0 }}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t("table.allStatus") || "All Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("table.allStatus") || "All Status"}</SelectItem>
              <SelectItem value="active">{t("table.active")}</SelectItem>
              <SelectItem value="archived">{t("table.archived")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("table.projects") || "Projects"}</CardTitle>
            <CardDescription>
              {filteredAndSortedProjects.length} {t("table.projects") || "projects"} found
            </CardDescription>
          </div>
          {/* Placeholder for future batch actions */}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("name")}
                    className="h-auto p-0 font-medium"
                  >
                    {t("table.name")}
                    {getSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead>{t("table.description") || "Description"}</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("sandboxCount")}
                    className="h-auto p-0 font-medium"
                  >
                    {t("table.sandboxes") || "Sandboxes"}
                    {getSortIcon("sandboxCount")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("apiKeyCount")}
                    className="h-auto p-0 font-medium"
                  >
                    {t("table.apiKeys") || "API Keys"}
                    {getSortIcon("apiKeyCount")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("totalSpent")}
                    className="h-auto p-0 font-medium"
                  >
                    {t("table.totalSpent")}
                    {getSortIcon("totalSpent")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("status")}
                    className="h-auto p-0 font-medium"
                  >
                    {t("table.status")}
                    {getSortIcon("status")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("updatedAt")}
                    className="h-auto p-0 font-medium"
                  >
                    {t("table.updated") || "Updated"}
                    {getSortIcon("updatedAt")}
                  </Button>
                </TableHead>
                <TableHead className="text-right">{t("table.actions") || "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground max-w-xs truncate">{project.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{project.sandboxCount}</TableCell>
                  <TableCell>{project.apiKeyCount}</TableCell>
                  <TableCell>${project.totalSpent.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={project.status === "active" ? "default" : "secondary"}>
                      {t(`table.${project.status}`) || project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{project.updatedAt}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewSandboxes(project)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Sandboxes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(project)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t("action.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchiveProject(project.id)}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          {t("action.archive")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteProject(project.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("action.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Sandboxes Dialog */}
      <Dialog open={viewSandboxesDialog.open} onOpenChange={(open) => setViewSandboxesDialog({ open, project: null })}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Sandboxes in "{viewSandboxesDialog.project?.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewSandboxesDialog.project && (
              <div>
                <div className="text-sm text-muted-foreground mb-4">
                  {getProjectSandboxes(viewSandboxesDialog.project.id).length} sandboxes in this project
                </div>
                <div className="space-y-2">
                  {getProjectSandboxes(viewSandboxesDialog.project.id).map((sandbox) => (
                    <div key={sandbox.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-medium">{sandbox.name}</span>
                        <Badge variant={sandbox.status === "running" ? "default" : "secondary"}>
                          {sandbox.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {getProjectSandboxes(viewSandboxesDialog.project.id).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No sandboxes in this project yet
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, project: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("action.edit")} {t("table.project") || "Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editProjectName">{t("table.name")}</Label>
              <Input
                id="editProjectName"
                value={editProject.name}
                onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                placeholder={t("table.name")}
              />
            </div>
            <div>
              <Label htmlFor="editProjectDescription">{t("table.description") || "Description"}</Label>
              <Textarea
                id="editProjectDescription"
                value={editProject.description}
                onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                placeholder={t("table.description") || "Describe your project"}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, project: null })}>
                {t("action.cancel")}
              </Button>
              <Button onClick={handleEditProject}>
                {t("action.update")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

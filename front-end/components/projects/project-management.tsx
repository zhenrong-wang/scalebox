"use client"

import { useState, useEffect } from "react"
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
import { ProjectService, Project } from "../../services/project-service"
import type { Sandbox } from "../../types/sandbox"
import { SandboxService } from "../../services/sandbox-service"
import { toast } from "sonner"

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([])
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
  const [projectSandboxes, setProjectSandboxes] = useState<Sandbox[]>([])
  const [sandboxesLoading, setSandboxesLoading] = useState(false)
  const { t } = useLanguage()
  const projectService = new ProjectService()

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectService.getProjects()
        setProjects(response.projects)
      } catch (error) {
        console.error("Error fetching projects:", error)
      }
    }
    fetchProjects()
  }, [])

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
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const handleCreateProject = async () => {
    if (!newProject.name.trim() || !newProject.description.trim()) return

    try {
      const createdProject = await projectService.createProject({
        name: newProject.name,
        description: newProject.description
      })
      setProjects([createdProject, ...projects])
      setNewProject({ name: "", description: "" })
      setIsCreateDialogOpen(false)
      toast.success(t("project.createSuccess") || "Project created successfully");
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error(t("project.createError") || "Failed to create project");
    }
  }

  const handleEditProject = async () => {
    if (!editDialog.project) return;
    
    try {
      const updatedProject = await projectService.updateProject(editDialog.project.project_id, {
        name: editProject.name,
        description: editProject.description
      });
      
      setProjects(projects.map(project => 
        project.project_id === editDialog.project!.project_id ? updatedProject : project
      ));
      
      setEditDialog({ open: false, project: null });
      toast.success(t("project.editSuccess") || "Project updated successfully");
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error(t("project.editError") || "Failed to update project");
    }
  };

  const openEditDialog = (project: Project) => {
    setEditProject({
      name: project.name,
      description: project.description || "",
    })
    setEditDialog({ open: true, project })
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      await projectService.deleteProject(projectId)
      setProjects(projects.filter((p) => p.project_id !== projectId))
      toast.success(t("project.deleteSuccess") || "Project deleted successfully");
    } catch (error) {
      console.error("Error deleting project:", error)
      toast.error(t("project.deleteError") || "Failed to delete project");
    }
  }

  const handleArchiveProject = async (projectId: string) => {
    try {
      const updatedProject = await projectService.updateProject(projectId, { status: "archived" })
      setProjects(projects.map((p) => (p.project_id === projectId ? updatedProject : p)))
      toast.success(t("project.archiveSuccess") || "Project archived successfully");
    } catch (error) {
      console.error("Error archiving project:", error)
      toast.error(t("project.archiveError") || "Failed to archive project");
    }
  }

  const openViewSandboxes = async (project: Project) => {
    setViewSandboxesDialog({ open: true, project });
    setSandboxesLoading(true);
    
    try {
      const sandboxes = await SandboxService.getSandboxesByProject(project.project_id)
      setProjectSandboxes(sandboxes);
    } catch (error) {
      console.error("Error fetching sandboxes:", error);
      toast.error(t("project.sandboxesError") || "Failed to load sandboxes");
    } finally {
      setSandboxesLoading(false);
    }
  };

  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status === "active").length
  const totalSandboxes = projects.reduce((sum, p) => sum + p.sandbox_count, 0)
  const totalSpent = projects.reduce((sum, p) => sum + p.total_spent, 0)

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
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("project.search") || "Search projects..."}
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
                  <SelectItem value="active">{t("table.active") || "Active"}</SelectItem>
                  <SelectItem value="archived">{t("table.archived") || "Archived"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  <TableRow key={project.project_id}>
                    <ResizableTableCell>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-muted-foreground">{project.project_id}</div>
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
                        {sandboxesLoading ? "Loading..." : projectSandboxes.length} {t("table.sandboxes") || "sandboxes"}
                      </Button>
                    </ResizableTableCell>
                    <ResizableTableCell>{project.api_key_count}</ResizableTableCell>
                    <ResizableTableCell>${project.total_spent.toFixed(2)}</ResizableTableCell>
                    <ResizableTableCell>
                      <Badge variant={project.status === "active" ? "default" : "secondary"}>
                        {project.status === "active" ? t("table.active") || "Active" : t("table.archived") || "Archived"}
                      </Badge>
                    </ResizableTableCell>
                    <ResizableTableCell>{new Date(project.created_at).toLocaleDateString()}</ResizableTableCell>
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
                            onClick={() => handleArchiveProject(project.project_id)}
                            className={project.status === "active" ? "" : "hidden"}
                          >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {t("action.archive") || "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project.project_id)}
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
            {sandboxesLoading ? (
              <div className="text-center py-8">
                <p>{t("project.loadingSandboxes") || "Loading sandboxes..."}</p>
              </div>
            ) : projectSandboxes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("project.noSandboxes") || "No sandboxes in this project"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projectSandboxes.map((sandbox) => (
                  <div key={sandbox.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div>
                      <p className="font-medium">{sandbox.name}</p>
                      <p className="text-sm text-muted-foreground">{sandbox.id}</p>
                    </div>
                    <Badge variant="secondary">{sandbox.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

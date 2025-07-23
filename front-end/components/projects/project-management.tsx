"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, FolderOpen, Settings, Trash2, Edit, Box, DollarSign, Eye, Users, UserPlus, UserMinus, FolderPlus } from "lucide-react"
import { SortIndicator } from "@/components/ui/sort-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
import { CopyButton } from "@/components/ui/copy-button"
import { EditableDescription } from "@/components/ui/editable-description"
import { EditableName } from "@/components/ui/editable-name"

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [viewSandboxesDialog, setViewSandboxesDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
  const [sandboxManagementDialog, setSandboxManagementDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
  })
  const [defaultProjectSandboxes, setDefaultProjectSandboxes] = useState<Sandbox[]>([])
  const [selectedSandboxesForNewProject, setSelectedSandboxesForNewProject] = useState<Set<string>>(new Set())
  const [defaultProjectSandboxesLoading, setDefaultProjectSandboxesLoading] = useState(false)
  const [editDialog, setEditDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
  const [editProject, setEditProject] = useState({
    name: "",
    description: "",
  })
  const [projectSandboxes, setProjectSandboxes] = useState<Sandbox[]>([])
  const [sandboxesLoading, setSandboxesLoading] = useState(false)
  const [availableSandboxes, setAvailableSandboxes] = useState<Sandbox[]>([])
  const [availableSandboxesLoading, setAvailableSandboxesLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ name?: string; description?: string }>({})
  const { t } = useLanguage()
  const projectService = new ProjectService()

  const fetchProjects = async () => {
    try {
      const response = await projectService.getProjects()
      setProjects(response.projects)
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  useEffect(() => {
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
    // Clear previous validation errors
    setValidationErrors({})
    
    // Validate required fields
    const errors: { name?: string; description?: string } = {}
    if (!newProject.name.trim()) {
      errors.name = t("project.nameRequired") || "Project name is required"
    }
    // Remove description validation - it's optional
    // if (!newProject.description.trim()) {
    //   errors.description = t("project.descriptionRequired") || "Project description is required"
    // }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      const createdProject = await projectService.createProject({
        name: newProject.name,
        description: newProject.description || undefined // Send undefined if empty
      })
      
      // Add selected sandboxes to the new project
      if (selectedSandboxesForNewProject.size > 0) {
        for (const sandboxId of selectedSandboxesForNewProject) {
          try {
            await projectService.addSandboxToProject(createdProject.project_id, sandboxId)
          } catch (error) {
            console.error(`Error adding sandbox ${sandboxId} to project:`, error)
          }
        }
      }
      
      setProjects([createdProject, ...projects])
      setNewProject({ name: "", description: "" })
      setSelectedSandboxesForNewProject(new Set())
      setIsCreateDialogOpen(false)
      toast.success(t("project.createSuccess") || "Project created successfully");
    } catch (error) {
      console.error("Error creating project:", error)
      
      // Handle duplicate project name error gracefully
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        if (errorMessage.includes('unique') || errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
          toast.error(t("project.duplicateNameError") || "A project with this name already exists. Please choose a different name.");
        } else {
          toast.error(t("project.createError") || "Failed to create project");
        }
      } else {
        toast.error(t("project.createError") || "Failed to create project");
      }
    }
  }

  const handleEditProject = async () => {
    if (!editDialog.project) return;
    
    // Prevent editing default project name
    if (editDialog.project.is_default && editProject.name !== editDialog.project.name) {
      toast.error(t("project.cannotRenameDefault") || "Cannot rename the default project");
      return;
    }
    
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

  const updateProjectDescription = async (projectId: string, newDescription: string) => {
    try {
      const updatedProject = await projectService.updateProject(projectId, {
        description: newDescription
      });
      
      setProjects(projects.map(project => 
        project.project_id === projectId ? updatedProject : project
      ));
      
      toast.success(t("project.editSuccess") || "Project updated successfully");
    } catch (error) {
      console.error("Error updating project description:", error);
      toast.error(t("project.editError") || "Failed to update project");
      throw error; // Re-throw to keep editing mode active
    }
  };

  const updateProjectName = async (projectId: string, newName: string) => {
    try {
      const updatedProject = await projectService.updateProject(projectId, {
        name: newName
      });
      
      setProjects(projects.map(project => 
        project.project_id === projectId ? updatedProject : project
      ));
      
      toast.success(t("project.editSuccess") || "Project updated successfully");
    } catch (error) {
      console.error("Error updating project name:", error);
      toast.error(t("project.editError") || "Failed to update project");
      throw error; // Re-throw to keep editing mode active
    }
  };

  const validateProjectNameDuplicate = (newName: string, currentName: string): boolean => {
    if (newName.toLowerCase() === currentName.toLowerCase()) {
      return false // Not a duplicate if it's the same name
    }
    return projects.some(project => project.name.toLowerCase() === newName.toLowerCase())
  };

  const loadDefaultProjectSandboxes = async () => {
    console.log("=== LOAD DEFAULT PROJECT SANDBOXES CALLED ===")
    setDefaultProjectSandboxesLoading(true)
    try {
      console.log("Loading default project sandboxes...")
      console.log("Current projects state:", projects)
      
      // Check authentication token
      const token = localStorage.getItem('auth-token')
      console.log("Auth token available:", !!token)
      
      // First try to find the default project from local state
      let defaultProject = projects.find(p => p.is_default)
      console.log("Default project from local state:", defaultProject)
      
      // If not found in local state, fetch projects from API
      if (!defaultProject) {
        console.log("Default project not found in local state, fetching from API...")
        const response = await projectService.getProjects()
        defaultProject = response.projects.find(p => p.is_default)
        console.log("Default project from API:", defaultProject)
      }
      
      if (defaultProject) {
        console.log("Fetching sandboxes for project:", defaultProject.project_id)
        const sandboxes = await projectService.getProjectSandboxes(defaultProject.project_id)
        console.log("Sandboxes fetched:", sandboxes)
        // Filter out archived sandboxes
        const nonArchivedSandboxes = sandboxes.filter(sandbox => sandbox.status !== 'archived')
        setDefaultProjectSandboxes(nonArchivedSandboxes)
      } else {
        console.log("No default project found")
        setDefaultProjectSandboxes([])
      }
    } catch (error) {
      console.error("Error loading default project sandboxes:", error)
      setDefaultProjectSandboxes([])
    } finally {
      setDefaultProjectSandboxesLoading(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.project_id === projectId)
    if (project) {
      setDeleteDialog({ open: true, project })
    }
  }

  const confirmDeleteProject = async () => {
    if (!deleteDialog.project) return
    
    try {
      await projectService.deleteProject(deleteDialog.project.project_id)
      setDeleteDialog({ open: false, project: null })
      fetchProjects()
      toast.success(t("project.deleted_successfully") || "Project deleted successfully")
    } catch (error) {
      console.error('Failed to delete project:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete project'
      toast.error(errorMessage)
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

  const openSandboxManagement = async (project: Project) => {
    setSandboxManagementDialog({ open: true, project })
    setSandboxesLoading(true)
    setAvailableSandboxesLoading(true)
    
    try {
      // Load current project sandboxes
      const sandboxes = await projectService.getProjectSandboxes(project.project_id)
      setProjectSandboxes(sandboxes)
      
      // Load available sandboxes from default project (only for non-default projects)
      if (!project.is_default) {
        const defaultProject = projects.find(p => p.is_default)
        if (defaultProject) {
          const defaultSandboxes = await projectService.getProjectSandboxes(defaultProject.project_id)
          // Filter out archived sandboxes
          const nonArchivedSandboxes = defaultSandboxes.filter(sandbox => sandbox.status !== 'archived')
          setAvailableSandboxes(nonArchivedSandboxes)
        }
      }
    } catch (error) {
      console.error("Error loading sandboxes:", error)
    } finally {
      setSandboxesLoading(false)
      setAvailableSandboxesLoading(false)
    }
  }



  const evictSandbox = async (sandboxId: string) => {
    if (!sandboxManagementDialog.project) return;
    
    try {
      await projectService.evictSandboxFromProject(sandboxManagementDialog.project.project_id, sandboxId);
      
      // Refresh sandboxes
      const sandboxes = await projectService.getProjectSandboxes(sandboxManagementDialog.project.project_id);
      setProjectSandboxes(sandboxes);
      
      // Refresh available sandboxes from default project
      const defaultProject = projects.find(p => p.is_default);
      if (defaultProject) {
        const defaultProjectSandboxes = await projectService.getProjectSandboxes(defaultProject.project_id);
        setAvailableSandboxes(defaultProjectSandboxes);
      }
      
      // Refresh the main projects list to update sandbox counts
      await fetchProjects();
      
      toast.success(t("project.sandboxEvicted") || "Sandbox evicted successfully");
    } catch (error) {
      console.error("Error evicting sandbox:", error);
      toast.error(t("project.sandboxEvictError") || "Failed to evict sandbox");
    }
  };

  const addSandboxToProject = async (sandboxId: string) => {
    if (!sandboxManagementDialog.project) return;
    
    try {
      await projectService.addSandboxToProject(sandboxManagementDialog.project.project_id, sandboxId);
      
      // Refresh sandboxes
      const sandboxes = await projectService.getProjectSandboxes(sandboxManagementDialog.project.project_id);
      setProjectSandboxes(sandboxes);
      
      // Refresh available sandboxes from default project
      const defaultProject = projects.find(p => p.is_default);
      if (defaultProject) {
        const defaultProjectSandboxes = await projectService.getProjectSandboxes(defaultProject.project_id);
        setAvailableSandboxes(defaultProjectSandboxes);
      }
      
      // Refresh the main projects list to update sandbox counts
      await fetchProjects();
      
      toast.success(t("project.sandboxAdded") || "Sandbox added to project successfully");
    } catch (error) {
      console.error("Error adding sandbox:", error);
      toast.error(t("project.sandboxAddError") || "Failed to add sandbox to project");
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

  const [currentSandboxesSearch, setCurrentSandboxesSearch] = useState("");
  const [availableSandboxesSearch, setAvailableSandboxesSearch] = useState("");

  return (
    <PageLayout
      header={{
        description: t("project.description") || "Manage your development projects",
        children: (
          <Button onClick={() => {
            setIsCreateDialogOpen(true)
            loadDefaultProjectSandboxes()
          }}>
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
                    columnId="sandboxCount"
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
                        <div className="font-medium flex items-center gap-2">
                          <EditableName
                          value={project.name}
                          onSave={(newName) => updateProjectName(project.project_id, newName)}
                          onValidateDuplicate={validateProjectNameDuplicate}
                          placeholder={t("project.namePlaceholder") || "Enter project name"}
                          resourceType="project"
                          className="text-sm"
                          disabled={project.is_default}
                        />
                          {project.is_default && (
                            <Badge variant="outline" className="text-xs">
                              {t("table.default") || "Default"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">{project.project_id}</span>
                          <CopyButton value={project.project_id} size="sm" variant="ghost" />
                        </div>
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <EditableDescription
                        value={project.description || ""}
                        onSave={(newDescription) => updateProjectDescription(project.project_id, newDescription)}
                        placeholder={t("project.descriptionPlaceholder") || "Enter project description"}
                        className="text-sm"
                        disabled={project.is_default}
                      />
                    </ResizableTableCell>
                    <ResizableTableCell>
                      {project.sandbox_count}
                    </ResizableTableCell>
                    <ResizableTableCell>${(project.total_spent || 0).toFixed(2)}</ResizableTableCell>
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
                          <DropdownMenuItem 
                            onClick={() => openEditDialog(project)}
                            className={project.is_default ? "opacity-50 cursor-not-allowed" : ""}
                            disabled={project.is_default}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t("action.edit") || "Edit"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openViewSandboxes(project)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t("action.viewSandboxes") || "View Sandboxes"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openSandboxManagement(project)}
                            className={project.is_default ? "opacity-50 cursor-not-allowed" : ""}
                            disabled={project.is_default}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            {t("action.manageSandboxes") || "Manage Sandboxes"}
                            {project.is_default && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({t("project.defaultProjectAutoManaged") || "Auto-managed"})
                              </span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project.project_id)}
                            className={`text-destructive ${project.is_default || project.sandbox_count > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={project.is_default || project.sandbox_count > 0}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("action.delete") || "Delete"}
                            {project.sandbox_count > 0 && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({t("project.cannotDeleteWithSandboxes") || "Has sandboxes"})
                              </span>
                            )}
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
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        console.log("=== DIALOG ONOPENCHANGE CALLED ===", open)
        setIsCreateDialogOpen(open)
        if (open) {
          console.log("=== DIALOG IS OPENING, CALLING LOAD FUNCTION ===")
          loadDefaultProjectSandboxes()
        } else {
          setSelectedSandboxesForNewProject(new Set())
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("project.createProject") || "Create New Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">{t("table.name") || "Name"} *</Label>
              <Input
                id="project-name"
                value={newProject.name}
                onChange={(e) => {
                  setNewProject({ ...newProject, name: e.target.value })
                  if (validationErrors.name) {
                    setValidationErrors({ ...validationErrors, name: undefined })
                  }
                }}
                placeholder={t("project.namePlaceholder") || "Enter project name"}
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="project-description">{t("table.description") || "Description"}</Label>
              <Textarea
                id="project-description"
                value={newProject.description}
                onChange={(e) => {
                  setNewProject({ ...newProject, description: e.target.value })
                  if (validationErrors.description) {
                    setValidationErrors({ ...validationErrors, description: undefined })
                  }
                }}
                placeholder={t("project.descriptionPlaceholder") || "Enter project description"}
                className={validationErrors.description ? "border-red-500" : ""}
              />
              {validationErrors.description && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.description}</p>
              )}
            </div>
            
            {/* Sandbox Selection Section */}
            <div>
              <Label>{t("project.selectSandboxesFromDefault") || "Select Sandboxes from Default Project"}</Label>
              <p className="text-sm text-muted-foreground mb-3">
                {t("project.selectSandboxesFromDefaultDescription") || "Choose sandboxes to add to your new project"}
              </p>
              
              {defaultProjectSandboxesLoading ? (
                <div className="text-center py-4">
                  <p>{t("project.loadingSandboxes") || "Loading sandboxes..."}</p>
                </div>
              ) : defaultProjectSandboxes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>{t("project.noSandboxesInDefault") || "No sandboxes in default project"}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {defaultProjectSandboxes.map((sandbox) => (
                    <div key={sandbox.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md">
                      <input
                        type="checkbox"
                        id={`sandbox-${sandbox.id}`}
                        checked={selectedSandboxesForNewProject.has(sandbox.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedSandboxesForNewProject)
                          if (e.target.checked) {
                            newSelected.add(sandbox.id)
                          } else {
                            newSelected.delete(sandbox.id)
                          }
                          setSelectedSandboxesForNewProject(newSelected)
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`sandbox-${sandbox.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{sandbox.name}</div>
                        <div className="text-sm text-muted-foreground">{sandbox.status}</div>
                      </label>
                      <Badge variant="secondary">{sandbox.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedSandboxesForNewProject.size > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedSandboxesForNewProject.size} sandbox{selectedSandboxesForNewProject.size > 1 ? 'es' : ''} selected
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false)
              setSelectedSandboxesForNewProject(new Set())
            }}>
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
                disabled={editDialog.project?.is_default}
              />
              {editDialog.project?.is_default && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("project.defaultProjectNameNote") || "Default project name cannot be changed"}
                </p>
              )}
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
          <DialogFooter>
            <Button onClick={() => setViewSandboxesDialog({ open: false, project: null })}>
              {t("action.close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sandbox Management Dialog */}
      <Dialog open={sandboxManagementDialog.open} onOpenChange={(open) => setSandboxManagementDialog({ open, project: null })}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {sandboxManagementDialog.project?.name} - {t("action.manageSandboxes") || "Manage Sandboxes"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Current Sandboxes Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                {t("project.currentSandboxes") || "Current Sandboxes"} ({projectSandboxes.length})
              </h3>
              {sandboxesLoading ? (
                <div className="text-center py-4">
                  <p>{t("project.loadingSandboxes") || "Loading sandboxes..."}</p>
                </div>
              ) : projectSandboxes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>{t("project.noSandboxes") || "No sandboxes in this project"}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectSandboxes.map((sandbox) => (
                    <div key={sandbox.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div className="flex-1">
                        <p className="font-medium">{sandbox.name}</p>
                        <p className="text-sm text-muted-foreground">{sandbox.status}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{sandbox.status}</Badge>
                        {!sandboxManagementDialog.project?.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => evictSandbox(sandbox.id)}
                            className="text-destructive hover:text-destructive"
                            disabled={sandbox.status === "archived"}
                          >
                            <UserMinus className="h-4 w-4 mr-1" />
                            {t("action.evict") || "Evict"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Sandboxes Section - Only show for non-default projects */}
            {!sandboxManagementDialog.project?.is_default && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  {t("project.sandboxesFromDefault") || "Sandboxes from Default Project"} ({availableSandboxes.length})
                </h3>
                {availableSandboxesLoading ? (
                  <div className="text-center py-4">
                    <p>{t("project.loadingSandboxes") || "Loading sandboxes..."}</p>
                  </div>
                ) : availableSandboxes.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>{t("project.noSandboxesInDefault") || "No sandboxes in default project"}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableSandboxes.map((sandbox) => (
                      <div key={sandbox.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex-1">
                          <p className="font-medium">{sandbox.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {sandbox.status} • {t("project.fromDefaultProject") || "From Default Project"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{sandbox.status}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addSandboxToProject(sandbox.id)}
                            disabled={sandbox.status === "archived"}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            {t("action.add") || "Add"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSandboxManagementDialog({ open: false, project: null })}>
              {t("action.cancel") || "Cancel"}
            </Button>
            <Button onClick={() => setSandboxManagementDialog({ open: false, project: null })}>
              {t("action.ok") || "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, project: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("project.deleteProject") || "Delete Project"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the project "{deleteDialog.project?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, project: null })}>
              {t("action.cancel") || "Cancel"}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteProject}>
              {t("action.delete") || "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </PageLayout>
  )
}

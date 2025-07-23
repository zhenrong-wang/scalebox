"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, Edit, Trash2, Eye, Copy, Globe, Lock, Cpu, HardDrive, ExternalLink, User, Play } from "lucide-react"
import { SortIndicator } from "@/components/ui/sort-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useLanguage } from "../contexts/language-context"
import { tReplace } from "../lib/i18n"
import { templateService, type Template, type TemplateCreateRequest, type TemplateUpdateRequest } from "../services/template-service"
import { UserService } from "../services/user-service"
import { useToast } from "@/hooks/use-toast"
import { ResizableTable, ResizableTableHead, ResizableTableCell } from "@/components/ui/resizable-table"
import { TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { EditableDescription } from "@/components/ui/editable-description"
import { EditableName } from "@/components/ui/editable-name"
import { PageLayout, PageHeader, SummaryCard } from "@/components/ui/page-layout"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CopyButton } from "@/components/ui/copy-button"

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editDialog, setEditDialog] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null })
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    language: '',
    cpu_spec: 1.0,
    memory_spec: 1.0,
    repository_url: '',
    tags: [] as string[],
    is_public: false,
  });

  const [editTemplate, setEditTemplate] = useState({
    template_id: '',
    name: '',
    description: '',
    category: '',
    language: '',
    cpu_spec: 1.0,
    memory_spec: 1.0,
    repository_url: '',
    tags: [] as string[],
    is_public: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [currentUser, setCurrentUser] = useState<{ id?: number; role?: string }>({})
  const { t } = useLanguage()
  const { toast } = useToast()

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates()
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const userData = await UserService.getCurrentUser(false) // No auto-redirect for component loading
      if (userData) {
        setCurrentUser({
          id: userData.id,
          role: userData.role
        })
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const filters: any = {}
      if (categoryFilter !== "all") filters.category = categoryFilter
      if (languageFilter !== "all") filters.language = languageFilter
      
      const response = await templateService.getTemplates(filters)
      setTemplates(response.templates)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      toast({
        title: "Error",
        description: t('templates.failed_to_load'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: keyof Template) => {
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

  const sortTemplates = (templates: Template[]) => {
    if (!sortField) return templates
    
    return [...templates].sort((a, b) => {
      let aValue = a[sortField as keyof Template] || ""
      let bValue = b[sortField as keyof Template] || ""
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }

  const filterTemplates = (templates: Template[]) => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      // Filter by visibility
      if (visibilityFilter === "public" && !template.is_public) return false
      if (visibilityFilter === "private" && template.is_public) return false
      
      return matchesSearch
    })
  }

  const handleCreateTemplate = async () => {
    // Clear previous validation errors
    setValidationErrors({})
    
    // Validate required fields
    const errors: Record<string, string> = {}
    
    if (!newTemplate.name.trim()) {
      errors.name = t('validation.nameRequired') || 'Name is required'
    } else if (newTemplate.name.trim().length < 2) {
      errors.name = t('validation.nameTooShort') || 'Name must be at least 2 characters'
    } else if (newTemplate.name.trim().length > 255) {
      errors.name = t('validation.nameTooLong') || 'Name must be 255 characters or less'
    }
    
    if (!newTemplate.category.trim()) {
      errors.category = t('validation.categoryRequired') || 'Category is required'
    }
    
    if (!newTemplate.language.trim()) {
      errors.language = t('validation.languageRequired') || 'Language is required'
    }
    
    // Check for duplicate name
    if (newTemplate.name.trim() && templates.some(t => t.name.toLowerCase() === newTemplate.name.trim().toLowerCase())) {
      errors.name = t('validation.nameDuplicate', { resourceType: 'template' }) || 'A template with this name already exists'
    }
    
    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast({
        title: "Validation Error",
        description: t('templates.fill_required_fields') || 'Please fix the validation errors',
        variant: "destructive",
      });
      return;
    }

    try {
      await templateService.createTemplate({
        name: newTemplate.name.trim(),
        description: newTemplate.description,
        category: newTemplate.category.trim(),
        language: newTemplate.language.trim(),
        cpu_spec: newTemplate.cpu_spec,
        memory_spec: newTemplate.memory_spec,
        is_public: false, // Regular users can only create private templates
        tags: newTemplate.tags,
      });
      setIsCreateDialogOpen(false)
      setNewTemplate({
        name: "",
        description: "",
        category: "",
        language: "",
        cpu_spec: 1.0,
        memory_spec: 1.0,
        repository_url: '',
        tags: [],
        is_public: false,
      })
      setValidationErrors({})
      fetchTemplates()
      toast({
        title: "Success",
        description: t('templates.created_successfully') || 'Template created successfully',
      })
    } catch (error) {
      console.error('Error creating template:', error)
      toast({
        title: "Error",
        description: t('templates.create_error') || 'Failed to create template',
        variant: "destructive",
      })
    }
  }

  const handleEditTemplate = (template: Template) => {
    setEditTemplate({
              template_id: template.template_id,
      name: template.name,
      description: template.description || '',
      category: template.category,
      language: template.language,
      cpu_spec: template.cpu_spec,
      memory_spec: template.memory_spec,
      repository_url: template.repository_url || '',
      tags: template.tags || [],
      is_public: template.is_public,
    })
    setEditDialog({ open: true, template })
  }

  const handleUpdateTemplate = async () => {
    if (!editDialog.template) return
    
    try {
      const templateData = {
        ...editTemplate,
        tags: editTemplate.tags?.filter(tag => tag.trim()) || [],
        // Regular users cannot change public status - preserve original value
        is_public: editDialog.template?.is_public || false
      }
      
      await templateService.updateTemplate(editDialog.template.template_id, templateData)
      setEditDialog({ open: false, template: null })
      fetchTemplates()
      toast({
        title: "Success",
        description: t('templates.updated_successfully') || 'Template updated successfully',
      })
    } catch (error) {
      console.error('Failed to update template:', error)
      toast({
        title: "Error",
        description: t('templates.failed_to_update') || 'Failed to update template',
        variant: "destructive",
      })
    }
  }

  const updateTemplateDescription = async (templateId: string, newDescription: string) => {
    try {
      const template = templates.find(t => t.template_id === templateId);
      if (!template) throw new Error("Template not found");
      
      const updatedTemplate = { ...template, description: newDescription };
      await templateService.updateTemplate(templateId, updatedTemplate);
      
      setTemplates(prev => prev.map(t => 
        t.template_id === templateId ? updatedTemplate : t
      ));
      toast({
        title: "Success",
        description: t('templates.updated_successfully') || 'Template updated successfully',
      });
    } catch (error) {
      console.error('Failed to update template description:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update template';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error; // Re-throw to keep editing mode active
    }
  };

  const updateTemplateName = async (templateId: string, newName: string) => {
    try {
      const template = templates.find(t => t.template_id === templateId);
      if (!template) throw new Error("Template not found");
      
      const updatedTemplate = { ...template, name: newName };
      await templateService.updateTemplate(templateId, updatedTemplate);
      
      setTemplates(prev => prev.map(t => 
        t.template_id === templateId ? updatedTemplate : t
      ));
      toast({
        title: "Success",
        description: t('templates.updated_successfully') || 'Template updated successfully',
      });
    } catch (error) {
      console.error('Failed to update template name:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update template';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error; // Re-throw to keep editing mode active
    }
  };

  const validateTemplateNameDuplicate = (newName: string, currentName: string): boolean => {
    if (newName.toLowerCase() === currentName.toLowerCase()) {
      return false // Not a duplicate if it's the same name
    }
    return templates.some(template => template.name.toLowerCase() === newName.toLowerCase())
  };

  const handleDeleteTemplate = async (template: Template) => {
    setDeleteDialog({ open: true, template })
  }

  const confirmDeleteTemplate = async () => {
    if (!deleteDialog.template) return
    
    try {
      await templateService.deleteTemplate(deleteDialog.template.template_id)
      setDeleteDialog({ open: false, template: null })
      fetchTemplates()
      toast({
        title: "Success",
        description: t('templates.deleted_successfully'),
      })
    } catch (error) {
      console.error('Failed to delete template:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete template'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleUseTemplate = async (template: Template) => {
    try {
      // TODO: Implement template usage logic
      toast({
        title: "Success",
        description: t('templates.usage_initiated') || 'Template usage initiated',
      })
    } catch (error) {
      console.error('Failed to use template:', error)
      toast({
        title: "Error",
        description: t('templates.failed_to_use') || 'Failed to use template',
        variant: "destructive",
      })
    }
  }

  const handleViewTemplate = async (template: Template) => {
    try {
      // TODO: Implement template details view
      toast({
        title: "Template Details",
        description: `${template.name} - ${template.description || 'No description'}`,
      })
    } catch (error) {
      console.error('Failed to view template:', error)
      toast({
        title: "Error",
        description: t('templates.failed_to_view') || 'Failed to view template details',
        variant: "destructive",
      })
    }
  }

  const handleSelectAll = () => {
    if (selectedTemplates.length === filteredTemplates.length) {
      setSelectedTemplates([])
    } else {
      setSelectedTemplates(filteredTemplates.map(t => t.template_id))
    }
  }

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    )
  }

  const handleBatchDelete = async () => {
    try {
      for (const templateId of selectedTemplates) {
        const template = templates.find(t => t.template_id === templateId)
        if (template && templateService.canDelete(template, currentUser.id, currentUser.role === 'admin')) {
          await templateService.deleteTemplate(templateId)
        }
      }
      setSelectedTemplates([])
      fetchTemplates()
      toast({
        title: "Success",
        description: t('templates.batch_deleted'),
      })
    } catch (error) {
      console.error('Failed to delete templates:', error)
      toast({
        title: "Error",
        description: t('templates.failed_to_delete_some'),
        variant: "destructive",
      })
    }
  }

  const filteredTemplates = filterTemplates(sortTemplates(templates))

  const categories = Array.from(new Set(templates.map(t => t.category)))
  const languages = Array.from(new Set(templates.map(t => t.language)))

  // Prepare summary cards data
  const publicTemplates = templates.filter(t => t.is_public)
  const privateTemplates = templates.filter(t => !t.is_public)
  
  const summaryCards = [
    {
      title: t('templates.total') || 'Total Templates',
      value: templates.length,
      icon: <Copy className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t('templates.public') || 'Public Templates',
      value: publicTemplates.length,
      icon: <Globe className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t('templates.private') || 'Private Templates',
      value: privateTemplates.length,
      icon: <Lock className="h-4 w-4 text-muted-foreground" />
    }
  ]

  // Memory spec options for dropdown
  const memoryOptions = [0.5, 1, 2, 4, 8, 16];

  const clearValidationErrors = () => {
    setValidationErrors({})
  }

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true)
    clearValidationErrors()
  }

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false)
    clearValidationErrors()
    setNewTemplate({
      name: "",
      description: "",
      category: "",
      language: "",
      cpu_spec: 1.0,
      memory_spec: 1.0,
      repository_url: '',
      tags: [],
      is_public: false,
    })
  }

  return (
    <PageLayout
      header={{
        description: t('templates.description') || 'Create and manage development environment templates',
        children: (
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('templates.create')}
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
              placeholder={t('templates.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('templates.filter_category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('templates.all_categories')}</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('templates.filter_language')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('templates.all_languages')}</SelectItem>
            {languages.map(language => (
              <SelectItem key={language} value={language}>{language}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('templates.filter_type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('templates.all_types')}</SelectItem>
            <SelectItem value="public">{t('templates.public')}</SelectItem>
            <SelectItem value="private">{t('templates.private')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batch Actions */}
      {selectedTemplates.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <span className="text-sm">{tReplace(t('templates.templates_selected'), { count: selectedTemplates.length })}</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('templates.delete_selected')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('templates.delete_templates')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {tReplace(t('templates.delete_confirmation'), { count: selectedTemplates.length })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleBatchDelete}>{t('action.delete')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Templates Table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <ResizableTable
              defaultColumnWidths={{
                checkbox: 48,
                name: 200,
                description: 250,
                cpu: 100,
                memory: 100,
                created: 120,
                updated: 120,
                visibility: 100,
                actions: 80
              }}
            >
              <TableHeader>
                <TableRow>
                  <ResizableTableHead columnId="checkbox" defaultWidth={48}>
                    <Checkbox
                      checked={selectedTemplates.length === filteredTemplates.length && filteredTemplates.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </ResizableTableHead>
                  <ResizableTableHead columnId="name" defaultWidth={200}>
                    <Button variant="ghost" onClick={() => handleSort("name")} className="h-auto p-0 group">
                      {t('templates.name')} {getSortIcon("name")}
                    </Button>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="description" defaultWidth={250}>
                    {t('table.description') || 'Description'}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="cpu" defaultWidth={100}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" onClick={() => handleSort("cpu_spec")} className="h-auto p-0 group">
                            <div className="flex items-center gap-1">
                              <Cpu className="h-4 w-4" />
                              {t('table.cpu')} {getSortIcon("cpu_spec")}
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('templates.minimum_cpu_requirement')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="memory" defaultWidth={100}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" onClick={() => handleSort("memory_spec")} className="h-auto p-0 group">
                            <div className="flex items-center gap-1">
                              <HardDrive className="h-4 w-4" />
                              {t('table.memory')} {getSortIcon("memory_spec")}
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('templates.minimum_memory_requirement')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="category" defaultWidth={120}>
                    {t('templates.category') || 'Category'}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="language" defaultWidth={120}>
                    {t('templates.language') || 'Language'}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="created" defaultWidth={120}>
                    <Button variant="ghost" onClick={() => handleSort("created_at")} className="h-auto p-0 group">
                      {t('templates.created')} {getSortIcon("created_at")}
                    </Button>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="updated" defaultWidth={120}>
                    <Button variant="ghost" onClick={() => handleSort("updated_at")} className="h-auto p-0 group">
                      {t('templates.updated')} {getSortIcon("updated_at")}
                    </Button>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="visibility" defaultWidth={100}>{t('table.visibility')}</ResizableTableHead>
                  <ResizableTableHead columnId="actions" defaultWidth={80}>{t('templates.actions')}</ResizableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.template_id}>
                    <ResizableTableCell>
                      <Checkbox
                        checked={selectedTemplates.includes(template.template_id)}
                        onCheckedChange={() => handleSelectTemplate(template.template_id)}
                        disabled={!templateService.canDelete(template, currentUser.id, currentUser.role === 'admin')}
                      />
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <div>
                        <EditableName
                          value={template.name}
                          onSave={(newName) => updateTemplateName(template.template_id, newName)}
                          onValidateDuplicate={validateTemplateNameDuplicate}
                          placeholder={t('templates.name') || "Enter template name"}
                          resourceType="template"
                          className="text-sm"
                          disabled={!templateService.canEdit(template, currentUser.id, currentUser.role === 'admin')}
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="font-mono">{template.template_id}</span>
                          <CopyButton value={template.template_id} size="sm" variant="ghost" />
                        </div>
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <EditableDescription
                        value={template.description || ""}
                        onSave={(newDescription) => updateTemplateDescription(template.template_id, newDescription)}
                        placeholder={t('templates.description_field') || "Enter description"}
                        className="text-sm text-muted-foreground"
                        disabled={!templateService.canEdit(template, currentUser.id, currentUser.role === 'admin')}
                      />
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <div className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{template.cpu_spec}</span>
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{template.memory_spec}GB</span>
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <div className="text-sm text-muted-foreground truncate" title={template.category || ''}>
                        {t('category.' + template.category) !== 'category.' + template.category ? t('category.' + template.category) : template.category}
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <div className="text-sm text-muted-foreground truncate" title={template.language || ''}>
                        {t('language.' + template.language) !== 'language.' + template.language ? t('language.' + template.language) : template.language}
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(template.created_at).toLocaleDateString()}
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(template.updated_at).toLocaleDateString()}
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      {template.is_public ? (
                        <Badge variant="secondary" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                            <Play className="mr-2 h-4 w-4" />
                            {t('templates.use')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewTemplate(template)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('action.viewDetails')}
                          </DropdownMenuItem>
                          {templateService.canEdit(template, currentUser.id, currentUser.role === 'admin') && (
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('action.edit')}
                            </DropdownMenuItem>
                          )}
                          {templateService.canDelete(template, currentUser.id, currentUser.role === 'admin') && (
                            <DropdownMenuItem onClick={() => handleDeleteTemplate(template)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('action.delete')}
                            </DropdownMenuItem>
                          )}
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

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('templates.create_new')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('templates.name')}</Label>
              <Input
                id="name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className={validationErrors.name ? "border-red-500 focus:border-red-500" : ""}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('templates.category')}</Label>
              <Input
                id="category"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                className={validationErrors.category ? "border-red-500 focus:border-red-500" : ""}
              />
              {validationErrors.category && (
                <p className="text-sm text-red-500">{validationErrors.category}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t('templates.language')}</Label>
              <Input
                id="language"
                value={newTemplate.language}
                onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                className={validationErrors.language ? "border-red-500 focus:border-red-500" : ""}
              />
              {validationErrors.language && (
                <p className="text-sm text-red-500">{validationErrors.language}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpu">{t('templates.cpu_spec')}</Label>
              <Input
                id="cpu"
                type="number"
                min="1"
                max="8"
                step="0.5"
                value={newTemplate.cpu_spec}
                onChange={(e) => setNewTemplate({ ...newTemplate, cpu_spec: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memory">{t('templates.memory_spec')}</Label>
              <Select value={newTemplate.memory_spec.toString()} onValueChange={(value) => setNewTemplate({ ...newTemplate, memory_spec: parseFloat(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {memoryOptions.map(option => (
                    <SelectItem key={option} value={option.toString()}>
                      {option} GB
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">{t('templates.tags')}</Label>
              <Input
                id="tags"
                placeholder="tag1, tag2, tag3"
                value={newTemplate.tags?.join(', ') || ''}
                onChange={(e) => setNewTemplate({ 
                  ...newTemplate, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">{t('templates.description_field')}</Label>
              <Textarea
                id="description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCreateDialog}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleCreateTemplate}>
              {t('templates.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, template: editDialog.template })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('templates.edit_template')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('templates.name')}</Label>
              <Input
                id="edit-name"
                value={editTemplate.name}
                onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">{t('templates.category')}</Label>
              <Input
                id="edit-category"
                value={editTemplate.category}
                onChange={(e) => setEditTemplate({ ...editTemplate, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-language">{t('templates.language')}</Label>
              <Input
                id="edit-language"
                value={editTemplate.language}
                onChange={(e) => setEditTemplate({ ...editTemplate, language: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cpu">{t('templates.cpu_spec')}</Label>
              <Input
                id="edit-cpu"
                type="number"
                min="1"
                max="8"
                step="0.5"
                value={editTemplate.cpu_spec}
                onChange={(e) => setEditTemplate({ ...editTemplate, cpu_spec: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-memory">{t('templates.memory_spec')}</Label>
              <Select value={editTemplate.memory_spec.toString()} onValueChange={(value) => setEditTemplate({ ...editTemplate, memory_spec: parseFloat(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {memoryOptions.map(option => (
                    <SelectItem key={option} value={option.toString()}>
                      {option} GB
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">{t('templates.tags')}</Label>
              <Input
                id="edit-tags"
                placeholder="tag1, tag2, tag3"
                value={editTemplate.tags?.join(', ') || ''}
                onChange={(e) => setEditTemplate({ 
                  ...editTemplate, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-description">{t('templates.description_field')}</Label>
              <Textarea
                id="edit-description"
                value={editTemplate.description}
                onChange={(e) => setEditTemplate({ ...editTemplate, description: e.target.value })}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, template: null })}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleUpdateTemplate}>
              {t('templates.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, template: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('templates.delete_template') || 'Delete Template'}</AlertDialogTitle>
            <AlertDialogDescription>
              {tReplace(t('templates.delete_single_confirmation'), { 
                name: deleteDialog.template?.name || '',
                count: '1'
              }) || `Are you sure you want to delete "${deleteDialog.template?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}

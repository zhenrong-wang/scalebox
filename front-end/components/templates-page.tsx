"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, Edit, Trash2, Eye, Copy, Globe, Lock, Cpu, HardDrive, ExternalLink, User, Play } from "lucide-react"
import { SortIndicator } from "@/components/ui/sort-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { PageLayout, PageHeader, SummaryCard } from "@/components/ui/page-layout"

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"official" | "private">("official")
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editDialog, setEditDialog] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null })
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
    id: '',
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
      const userData = await UserService.getCurrentUser()
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
      
      // Filter by tab
      const isOfficial = template.is_official
      const isPrivate = !template.is_official && !template.is_public
      
      if (activeTab === "official" && !isOfficial) return false
      if (activeTab === "private" && !isPrivate) return false
      
      return matchesSearch
    })
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.category || !newTemplate.language || !newTemplate.repository_url) {
      toast({
        title: "Error",
        description: t('templates.fill_required_fields') || 'Please fill in all required fields',
        variant: "destructive",
      });
      return;
    }

    try {
      await templateService.createTemplate({
        ...newTemplate,
        cpu_spec: newTemplate.cpu_spec,
        memory_spec: newTemplate.memory_spec,
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
      id: template.id,
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
        tags: editTemplate.tags?.filter(tag => tag.trim()) || []
      }
      
      await templateService.updateTemplate(editDialog.template.id, templateData)
      setEditDialog({ open: false, template: null })
      fetchTemplates()
      toast({
        title: "Success",
        description: t('templates.template_updated') || 'Template updated successfully',
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

  const handleDeleteTemplate = async (template: Template) => {
    try {
      await templateService.deleteTemplate(template.id)
      fetchTemplates()
      toast({
        title: "Success",
        description: t('templates.template_deleted'),
      })
    } catch (error) {
      console.error('Failed to delete template:', error)
      toast({
        title: "Error",
        description: t('templates.failed_to_delete'),
        variant: "destructive",
      })
    }
  }

  const handleMakeOfficial = async (template: Template) => {
    try {
      await templateService.makeTemplateOfficial(template.id)
      fetchTemplates()
      toast({
        title: "Success",
        description: t('templates.template_made_official'),
      })
    } catch (error) {
      console.error('Failed to make template official:', error)
      toast({
        title: "Error",
        description: t('templates.failed_to_make_official'),
        variant: "destructive",
      })
    }
  }

  const handleMakePublic = async (template: Template) => {
    try {
      await templateService.makeTemplatePublic(template.id)
      fetchTemplates()
      toast({
        title: "Success",
        description: t('templates.template_made_public'),
      })
    } catch (error) {
      console.error('Failed to make template public:', error)
      toast({
        title: "Error",
        description: t('templates.failed_to_make_public'),
        variant: "destructive",
      })
    }
  }

  const handleUseTemplate = async (template: Template) => {
    try {
      // TODO: Implement template usage logic
      toast({
        title: "Success",
        description: t('templates.template_used') || 'Template usage initiated',
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
      setSelectedTemplates(filteredTemplates.map(t => t.id))
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
        const template = templates.find(t => t.id === templateId)
        if (template && templateService.canDelete(template, currentUser.id, currentUser.role === 'admin')) {
          await templateService.deleteTemplate(templateId)
        }
      }
      setSelectedTemplates([])
      fetchTemplates()
      toast({
        title: "Success",
        description: t('templates.templates_deleted'),
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

  // Prepare summary cards data based on active tab
  const officialTemplates = templates.filter(t => t.is_official)
  const privateTemplates = templates.filter(t => !t.is_official && !t.is_public)
  
  const summaryCards = activeTab === "official" ? [
    {
      title: t('templates.total_official') || 'Total Official',
      value: officialTemplates.length,
      icon: <Lock className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t('templates.available') || 'Available',
      value: officialTemplates.length,
      icon: <Globe className="h-4 w-4 text-muted-foreground" />
    }
  ] : [
    {
      title: t('templates.total_private') || 'Total Private',
      value: privateTemplates.length,
      icon: <Edit className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: t('templates.owned') || 'Owned',
      value: privateTemplates.filter(t => t.owner_id === currentUser.id).length,
      icon: <User className="h-4 w-4 text-muted-foreground" />
    }
  ]

  // Memory spec options for dropdown
  const memoryOptions = [0.5, 1, 2, 4, 8, 16];

  return (
    <PageLayout
      header={{
        description: activeTab === "official" 
          ? (t('templates.official_description') || 'Browse and use official templates provided by ScaleBox')
          : (t('templates.private_description') || 'Manage your private templates'),
        children: activeTab === "private" ? (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('templates.create')}
          </Button>
        ) : undefined
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

      </div>

      {/* Template Type Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "official" | "private")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="official" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t('templates.official_templates') || 'Official Templates'}
          </TabsTrigger>
          <TabsTrigger value="private" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            {t('templates.private_templates') || 'Private Templates'}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Batch Actions */}
      {activeTab === "private" && selectedTemplates.length > 0 && (
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
                <AlertDialogAction onClick={handleBatchDelete}>{t('templates.delete')}</AlertDialogAction>
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
                checkbox: activeTab === "private" ? 48 : 0,
                name: 250,
                category: 120,
                language: 100,
                cpu: 80,
                memory: 80,
                created: 100,
                updated: 100,
                actions: 80
              }}
            >
              <TableHeader>
                <TableRow>
                  {activeTab === "private" && (
                    <ResizableTableHead columnId="checkbox" defaultWidth={48}>
                      <Checkbox
                        checked={selectedTemplates.length === filteredTemplates.length && filteredTemplates.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </ResizableTableHead>
                  )}
                  
                                      <ResizableTableHead columnId="name" defaultWidth={250}>
                    <Button variant="ghost" onClick={() => handleSort("name")} className="h-auto p-0 group">
                      {t('templates.name')} {getSortIcon("name")}
                    </Button>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="category" defaultWidth={120}>{t('templates.category')}</ResizableTableHead>
                  <ResizableTableHead columnId="language" defaultWidth={100}>{t('templates.language')}</ResizableTableHead>
                  <ResizableTableHead columnId="cpu" defaultWidth={80}>
                    <Button variant="ghost" onClick={() => handleSort("cpu_spec")} className="h-auto p-0 group">
                      <div className="flex items-center gap-1">
                        <Cpu className="h-4 w-4" />
                        {getSortIcon("cpu_spec")}
                      </div>
                    </Button>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="memory" defaultWidth={80}>
                    <Button variant="ghost" onClick={() => handleSort("memory_spec")} className="h-auto p-0 group">
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-4 w-4" />
                        {getSortIcon("memory_spec")}
                      </div>
                    </Button>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="created" defaultWidth={100}>
                    <Button variant="ghost" onClick={() => handleSort("created_at")} className="h-auto p-0 group">
                      <span className="text-xs">{t('templates.created')}</span> {getSortIcon("created_at")}
                    </Button>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="updated" defaultWidth={100}>
                    <Button variant="ghost" onClick={() => handleSort("updated_at")} className="h-auto p-0 group">
                      <span className="text-xs">{t('templates.updated')}</span> {getSortIcon("updated_at")}
                    </Button>
                  </ResizableTableHead>
                  <ResizableTableHead columnId="actions" defaultWidth={80}>
                    <span className="text-xs">{t('templates.actions')}</span>
                  </ResizableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                                      <ResizableTableCell>
                    {activeTab === "private" && (
                      <Checkbox
                        checked={selectedTemplates.includes(template.id)}
                        onCheckedChange={() => handleSelectTemplate(template.id)}
                        disabled={!templateService.canDelete(template, currentUser.id, currentUser.role === 'admin')}
                      />
                    )}
                  </ResizableTableCell>

                    <ResizableTableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {template.name}
                          {template.is_official && (
                            <Badge variant="secondary" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Official
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </div>
                        )}
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <Badge variant="secondary" className="text-xs">
                        {template.language}
                      </Badge>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            {activeTab === "official" ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {activeTab === "official" ? (
                            <>
                              <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                                <Play className="mr-2 h-4 w-4" />
                                {t('templates.use') || 'Use Template'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewTemplate(template)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {t('templates.view_details') || 'View Details'}
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              {templateService.canEdit(template, currentUser.id, currentUser.role === 'admin') && (
                                <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t('templates.edit')}
                                </DropdownMenuItem>
                              )}
                              {currentUser.role === 'admin' && !template.is_official && (
                                <DropdownMenuItem onClick={() => handleMakeOfficial(template)}>
                                  <Lock className="mr-2 h-4 w-4" />
                                  {t('templates.make_official')}
                                </DropdownMenuItem>
                              )}
                              {templateService.canDelete(template, currentUser.id, currentUser.role === 'admin') && (
                                <DropdownMenuItem onClick={() => handleDeleteTemplate(template)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('templates.delete')}
                                </DropdownMenuItem>
                              )}
                            </>
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
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('templates.category')}</Label>
              <Input
                id="category"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t('templates.language')}</Label>
              <Input
                id="language"
                value={newTemplate.language}
                onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
              />
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
              <Label htmlFor="repository_url">{t('templates.repository_url')}</Label>
              <Input
                id="repository_url"
                value={newTemplate.repository_url}
                onChange={(e) => setNewTemplate({ ...newTemplate, repository_url: e.target.value })}
              />
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
            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                id="is_public"
                checked={newTemplate.is_public}
                onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, is_public: checked as boolean })}
              />
              <Label htmlFor="is_public">{t('templates.make_public')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
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
              <Label htmlFor="edit-repository_url">{t('templates.repository_url')}</Label>
              <Input
                id="edit-repository_url"
                value={editTemplate.repository_url}
                onChange={(e) => setEditTemplate({ ...editTemplate, repository_url: e.target.value })}
              />
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
            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                id="edit-is-public"
                checked={editTemplate.is_public}
                onCheckedChange={(checked) => setEditTemplate({ ...editTemplate, is_public: checked as boolean })}
              />
              <Label htmlFor="edit-is-public">{t('templates.make_public')}</Label>
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
    </PageLayout>
  )
}

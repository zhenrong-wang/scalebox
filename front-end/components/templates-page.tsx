"use client"

import { useState } from "react"
import { Plus, Search, Filter, Star, Download, Edit, Trash2, Eye, Copy, Globe, Lock, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "../contexts/language-context"
import { tReplace } from "../lib/i18n"

interface Template {
  id: string
  name: string
  description: string
  category: string
  language: string
  stars: number
  downloads: number
  author: string
  isOfficial: boolean
  isPublic: boolean
  created: string
  updated: string
  tags: string[]
}

const mockOfficialTemplates: Template[] = [
  {
    id: "tpl-001",
    name: "React + TypeScript Starter",
    description: "A modern React application with TypeScript, Tailwind CSS, and essential development tools",
    category: "Frontend",
    language: "TypeScript",
    stars: 1250,
    downloads: 15420,
    author: "ScaleBox",
    isOfficial: true,
    isPublic: true,
    created: "2024-01-01",
    updated: "2024-01-20",
    tags: ["react", "typescript", "tailwind"],
  },
  {
    id: "tpl-002",
    name: "Node.js API Server",
    description: "Express.js API server with authentication, database integration, and comprehensive middleware",
    category: "Backend",
    language: "JavaScript",
    stars: 890,
    downloads: 8750,
    author: "ScaleBox",
    isOfficial: true,
    isPublic: true,
    created: "2024-01-05",
    updated: "2024-01-18",
    tags: ["nodejs", "express", "api"],
  },
  {
    id: "tpl-003",
    name: "Python Data Science",
    description: "Complete data science environment with Jupyter, pandas, numpy, and visualization libraries",
    category: "Data Science",
    language: "Python",
    stars: 2100,
    downloads: 12300,
    author: "ScaleBox",
    isOfficial: true,
    isPublic: true,
    created: "2024-01-03",
    updated: "2024-01-22",
    tags: ["python", "jupyter", "data-science"],
  },
  {
    id: "tpl-004",
    name: "Docker Microservices",
    description: "Multi-service architecture with Docker Compose, Redis, PostgreSQL, and monitoring",
    category: "DevOps",
    language: "Docker",
    stars: 750,
    downloads: 5200,
    author: "ScaleBox",
    isOfficial: true,
    isPublic: true,
    created: "2024-01-08",
    updated: "2024-01-15",
    tags: ["docker", "microservices", "devops"],
  },
  {
    id: "tpl-005",
    name: "Next.js Full Stack",
    description: "Full-stack Next.js application with authentication, database, and deployment configuration",
    category: "Full Stack",
    language: "TypeScript",
    stars: 1680,
    downloads: 9800,
    author: "ScaleBox",
    isOfficial: true,
    isPublic: true,
    created: "2024-01-12",
    updated: "2024-01-25",
    tags: ["nextjs", "fullstack", "typescript"],
  },
]

const mockPrivateTemplates: Template[] = [
  {
    id: "tpl-private-001",
    name: "My Custom API",
    description: "Personal API template with custom authentication and business logic",
    category: "Backend",
    language: "Node.js",
    stars: 0,
    downloads: 0,
    author: "You",
    isOfficial: false,
    isPublic: false,
    created: "2024-01-15",
    updated: "2024-01-20",
    tags: ["nodejs", "custom", "api"],
  },
  {
    id: "tpl-private-002",
    name: "React Dashboard Template",
    description: "Reusable dashboard template for internal projects",
    category: "Frontend",
    language: "React",
    stars: 0,
    downloads: 0,
    author: "You",
    isOfficial: false,
    isPublic: true,
    created: "2024-01-10",
    updated: "2024-01-18",
    tags: ["react", "dashboard", "internal"],
  },
]

export function TemplatesPage() {
  const [officialTemplates] = useState<Template[]>(mockOfficialTemplates)
  const [privateTemplates, setPrivateTemplates] = useState<Template[]>(mockPrivateTemplates)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editDialog, setEditDialog] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null })
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "",
    language: "",
    isPublic: false,
    tags: "",
  })
  const [editTemplate, setEditTemplate] = useState({
    name: "",
    description: "",
    category: "",
    language: "",
    isPublic: false,
    tags: "",
  })

  const { t } = useLanguage()

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

  const filteredOfficialTemplates = sortTemplates(officialTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter
    const matchesLanguage = languageFilter === "all" || template.language === languageFilter
    return matchesSearch && matchesCategory && matchesLanguage
  }))

  const filteredPrivateTemplates = sortTemplates(privateTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter
    const matchesLanguage = languageFilter === "all" || template.language === languageFilter
    return matchesSearch && matchesCategory && matchesLanguage
  }))

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.description.trim()) return

    const template: Template = {
      id: `tpl-private-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description,
      category: newTemplate.category || "Other",
      language: newTemplate.language || "Other",
      stars: 0,
      downloads: 0,
      author: "You",
      isOfficial: false,
      isPublic: newTemplate.isPublic,
      created: new Date().toISOString().split("T")[0],
      updated: new Date().toISOString().split("T")[0],
      tags: newTemplate.tags ? newTemplate.tags.split(",").map(tag => tag.trim()) : [],
    }

    setPrivateTemplates([template, ...privateTemplates])
    setNewTemplate({ name: "", description: "", category: "", language: "", isPublic: false, tags: "" })
    setIsCreateDialogOpen(false)
  }

  const handleEditTemplate = () => {
    if (!editDialog.template || !editTemplate.name.trim() || !editTemplate.description.trim()) return

    setPrivateTemplates(prev => prev.map(template => 
      template.id === editDialog.template!.id 
        ? {
            ...template,
            name: editTemplate.name,
            description: editTemplate.description,
            category: editTemplate.category || "Other",
            language: editTemplate.language || "Other",
            isPublic: editTemplate.isPublic,
            tags: editTemplate.tags ? editTemplate.tags.split(",").map(tag => tag.trim()) : [],
            updated: new Date().toISOString().split("T")[0],
          }
        : template
    ))
    setEditDialog({ open: false, template: null })
    setEditTemplate({ name: "", description: "", category: "", language: "", isPublic: false, tags: "" })
  }

  const openEditDialog = (template: Template) => {
    setEditTemplate({
      name: template.name,
      description: template.description,
      category: template.category,
      language: template.language,
      isPublic: template.isPublic,
      tags: template.tags.join(", "),
    })
    setEditDialog({ open: true, template })
  }

  const handleDeletePrivateTemplate = (id: string) => {
    setPrivateTemplates(privateTemplates.filter((template) => template.id !== id))
  }

  const totalOfficialTemplates = officialTemplates.length
  const totalPrivateTemplates = privateTemplates.length
  const totalTemplates = totalOfficialTemplates + totalPrivateTemplates

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{totalTemplates}</div>
          <div className="text-sm text-muted-foreground">{t("table.totalTemplates") || "Total Templates"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-blue-600">{totalOfficialTemplates}</div>
          <div className="text-sm text-muted-foreground">{t("table.officialTemplates") || "Official Templates"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{totalPrivateTemplates}</div>
          <div className="text-sm text-muted-foreground">{t("table.privateTemplates") || "Private Templates"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t("action.createTemplate")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("action.createTemplate")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName">{t("table.name")}</Label>
                  <Input
                    id="templateName"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder={t("table.name")}
                  />
                </div>
                <div>
                  <Label htmlFor="templateDescription">{t("table.description") || "Description"}</Label>
                  <Textarea
                    id="templateDescription"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder={t("table.description") || "Describe your template"}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="templateCategory">{t("table.category")}</Label>
                    <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("table.selectCategory") || "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Frontend">{t("table.Frontend")}</SelectItem>
                        <SelectItem value="Backend">{t("table.Backend")}</SelectItem>
                        <SelectItem value="Data Science">{t("table.Data Science")}</SelectItem>
                        <SelectItem value="DevOps">{t("table.DevOps")}</SelectItem>
                        <SelectItem value="Full Stack">{t("table.Full Stack")}</SelectItem>
                        <SelectItem value="Other">{t("table.Other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="templateLanguage">{t("table.language")}</Label>
                    <Select value={newTemplate.language} onValueChange={(value) => setNewTemplate({ ...newTemplate, language: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("table.selectLanguage") || "Select language"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TypeScript">{t("table.TypeScript")}</SelectItem>
                        <SelectItem value="JavaScript">{t("table.JavaScript")}</SelectItem>
                        <SelectItem value="Python">{t("table.Python")}</SelectItem>
                        <SelectItem value="Docker">{t("table.Docker")}</SelectItem>
                        <SelectItem value="React">{t("table.React")}</SelectItem>
                        <SelectItem value="Node.js">{t("table.Node.js")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="templateTags">{t("table.tags") || "Tags"}</Label>
                  <Input
                    id="templateTags"
                    value={newTemplate.tags}
                    onChange={(e) => setNewTemplate({ ...newTemplate, tags: e.target.value })}
                    placeholder="react, typescript, api (comma separated)"
                  />
                </div>
                <Button onClick={handleCreateTemplate} className="w-full">
                  {t("action.createTemplate")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex gap-4 items-center">
          <div className="relative" style={{ maxWidth: 320, flex: '0 1 auto' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("templates.search") || "Search templates..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-xs"
              style={{ minWidth: 0 }}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t("table.allCategories") || "All Categories"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("table.allCategories") || "All Categories"}</SelectItem>
              <SelectItem value="Frontend">{t("table.Frontend")}</SelectItem>
              <SelectItem value="Backend">{t("table.Backend")}</SelectItem>
              <SelectItem value="Data Science">{t("table.Data Science")}</SelectItem>
              <SelectItem value="DevOps">{t("table.DevOps")}</SelectItem>
              <SelectItem value="Full Stack">{t("table.Full Stack")}</SelectItem>
              <SelectItem value="Other">{t("table.Other")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t("table.allLanguages") || "All Languages"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("table.allLanguages") || "All Languages"}</SelectItem>
              <SelectItem value="TypeScript">{t("table.TypeScript")}</SelectItem>
              <SelectItem value="JavaScript">{t("table.JavaScript")}</SelectItem>
              <SelectItem value="Python">{t("table.Python")}</SelectItem>
              <SelectItem value="Docker">{t("table.Docker")}</SelectItem>
              <SelectItem value="React">{t("table.React")}</SelectItem>
              <SelectItem value="Node.js">{t("table.Node.js")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Tabs */}
      <Tabs defaultValue="official" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="official">
            {t("table.officialTemplates") || "Official Templates"} ({filteredOfficialTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="private">
            {t("table.privateTemplates") || "Private Templates"} ({filteredPrivateTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="official" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("table.officialTemplates") || "Official Templates"}</CardTitle>
                <CardDescription>
                  {filteredOfficialTemplates.length} {t("table.officialTemplates") || "official templates"} found
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
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("category")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.category")}
                        {getSortIcon("category")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("language")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.language")}
                        {getSortIcon("language")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("stars")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.stars")}
                        {getSortIcon("stars")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("downloads")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.downloads")}
                        {getSortIcon("downloads")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("updated")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.updated") || "Updated"}
                        {getSortIcon("updated")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">{t("table.actions") || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOfficialTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">{template.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{template.language}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          {template.stars.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>{template.downloads.toLocaleString()}</TableCell>
                      <TableCell>{template.updated}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              {t("action.use")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              {t("action.fork")}
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
        </TabsContent>

        <TabsContent value="private" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("table.privateTemplates") || "Private Templates"}</CardTitle>
              <CardDescription>
                {filteredPrivateTemplates.length} {t("table.privateTemplates") || "private templates"} found
              </CardDescription>
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
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("category")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.category")}
                        {getSortIcon("category")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("language")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.language")}
                        {getSortIcon("language")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("stars")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.stars")}
                        {getSortIcon("stars")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("downloads")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.downloads")}
                        {getSortIcon("downloads")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("updated")}
                        className="h-auto p-0 font-medium"
                      >
                        {t("table.updated") || "Updated"}
                        {getSortIcon("updated")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">{t("table.actions") || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrivateTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">{template.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{template.language}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          {template.stars.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>{template.downloads.toLocaleString()}</TableCell>
                      <TableCell>{template.updated}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("action.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              {t("action.use")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              {t("action.fork")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeletePrivateTemplate(template.id)} className="text-destructive">
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
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, template: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("action.edit")} {t("table.template") || "Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTemplateName">{t("table.name")}</Label>
              <Input
                id="editTemplateName"
                value={editTemplate.name}
                onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })}
                placeholder={t("table.name")}
              />
            </div>
            <div>
              <Label htmlFor="editTemplateDescription">{t("table.description") || "Description"}</Label>
              <Textarea
                id="editTemplateDescription"
                value={editTemplate.description}
                onChange={(e) => setEditTemplate({ ...editTemplate, description: e.target.value })}
                placeholder={t("table.description") || "Describe your template"}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editTemplateCategory">{t("table.category")}</Label>
                <Select value={editTemplate.category} onValueChange={(value) => setEditTemplate({ ...editTemplate, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("table.selectCategory") || "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Frontend">{t("table.Frontend")}</SelectItem>
                    <SelectItem value="Backend">{t("table.Backend")}</SelectItem>
                    <SelectItem value="Data Science">{t("table.Data Science")}</SelectItem>
                    <SelectItem value="DevOps">{t("table.DevOps")}</SelectItem>
                    <SelectItem value="Full Stack">{t("table.Full Stack")}</SelectItem>
                    <SelectItem value="Other">{t("table.Other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editTemplateLanguage">{t("table.language")}</Label>
                <Select value={editTemplate.language} onValueChange={(value) => setEditTemplate({ ...editTemplate, language: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("table.selectLanguage") || "Select language"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TypeScript">{t("table.TypeScript")}</SelectItem>
                    <SelectItem value="JavaScript">{t("table.JavaScript")}</SelectItem>
                    <SelectItem value="Python">{t("table.Python")}</SelectItem>
                    <SelectItem value="Docker">{t("table.Docker")}</SelectItem>
                    <SelectItem value="React">{t("table.React")}</SelectItem>
                    <SelectItem value="Node.js">{t("table.Node.js")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="editTemplateTags">{t("table.tags") || "Tags"}</Label>
              <Input
                id="editTemplateTags"
                value={editTemplate.tags}
                onChange={(e) => setEditTemplate({ ...editTemplate, tags: e.target.value })}
                placeholder="react, typescript, api (comma separated)"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, template: null })}>
                {t("action.cancel")}
              </Button>
              <Button onClick={handleEditTemplate}>
                {t("action.update")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

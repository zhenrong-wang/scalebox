"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, AlertTriangle, DollarSign, TrendingUp, CheckCircle, XCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResizableTable, ResizableTableHead, ResizableTableCell } from "@/components/ui/resizable-table"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "../contexts/language-context"
import { tReplace } from "../lib/i18n"
import { PageLayout } from "@/components/ui/page-layout"

interface Budget {
  id: string
  name: string
  limit: number
  spent: number
  period: "monthly" | "weekly" | "daily"
  alertThreshold: number
  alertEnabled: boolean
  status: "active" | "exceeded" | "warning"
}

const mockBudgets: Budget[] = [
  {
    id: "budget-001",
    name: "Monthly Sandbox Budget",
    limit: 200,
    spent: 145.5,
    period: "monthly",
    alertThreshold: 80,
    alertEnabled: true,
    status: "warning",
  },
  {
    id: "budget-002",
    name: "API Usage Budget",
    limit: 100,
    spent: 45.2,
    period: "monthly",
    alertThreshold: 90,
    alertEnabled: true,
    status: "active",
  },
  {
    id: "budget-003",
    name: "Development Budget",
    limit: 50,
    spent: 65.8,
    period: "weekly",
    alertThreshold: 75,
    alertEnabled: false,
    status: "exceeded",
  },
]

export function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; budget: Budget | null }>({
    isOpen: false,
    budget: null,
  })
  const [formData, setFormData] = useState({
    name: "",
    limit: "",
    period: "monthly",
    alertThreshold: "80",
    alertEnabled: true,
  })

  const { t } = useLanguage()

  const filteredBudgets = budgets.filter((budget) => 
    budget.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      name: "",
      limit: "",
      period: "monthly",
      alertThreshold: "80",
      alertEnabled: true,
    })
    setEditingBudget(null)
  }



  const openEditDialog = (budget: Budget) => {
    setFormData({
      name: budget.name,
      limit: budget.limit.toString(),
      period: budget.period,
      alertThreshold: budget.alertThreshold.toString(),
      alertEnabled: budget.alertEnabled,
    })
    setEditingBudget(budget)
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.limit) return

    const budgetData = {
      name: formData.name,
      limit: Number.parseFloat(formData.limit),
      period: formData.period as "monthly" | "weekly" | "daily",
      alertThreshold: Number.parseInt(formData.alertThreshold),
      alertEnabled: formData.alertEnabled,
      spent: editingBudget?.spent || 0,
      status: editingBudget?.status || ("active" as const),
    }

    if (editingBudget) {
      setBudgets((prev) =>
        prev.map((budget) => (budget.id === editingBudget.id ? { ...budget, ...budgetData } : budget)),
      )
    } else {
      const newBudget: Budget = {
        id: `budget-${Date.now()}`,
        ...budgetData,
      }
      setBudgets((prev) => [newBudget, ...prev])
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const openDeleteDialog = (budget: Budget) => {
    setDeleteDialog({ isOpen: true, budget })
  }

  const confirmDelete = () => {
    if (deleteDialog.budget) {
      setBudgets((prev) => prev.filter((budget) => budget.id !== deleteDialog.budget!.id))
      setDeleteDialog({ isOpen: false, budget: null })
    }
  }

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, budget: null })
  }

  const toggleAlert = (id: string) => {
    setBudgets((prev) =>
      prev.map((budget) => (budget.id === id ? { ...budget, alertEnabled: !budget.alertEnabled } : budget)),
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "exceeded":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    }
  }

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0)
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0)
  const activeBudgets = budgets.filter((budget) => budget.status === "active").length
  const exceededBudgets = budgets.filter((budget) => budget.status === "exceeded").length

  return (
    <PageLayout
      header={{
        description: t("account.setLimits"),
        children: (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("action.createBudget") || "Create Budget"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBudget ? t("action.editBudget") || "Edit Budget" : t("action.createBudget") || "Create Budget"}
                </DialogTitle>
              </DialogHeader>
              {/* Form content */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("table.name") || "Name"}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("table.budgetName") || "Budget name"}
                  />
                </div>
                <div>
                  <Label htmlFor="limit">{t("table.limit") || "Limit"}</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={formData.limit}
                    onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="period">{t("table.period") || "Period"}</Label>
                  <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("table.daily") || "Daily"}</SelectItem>
                      <SelectItem value="weekly">{t("table.weekly") || "Weekly"}</SelectItem>
                      <SelectItem value="monthly">{t("table.monthly") || "Monthly"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alertThreshold">{t("table.alertThreshold") || "Alert Threshold (%)"}</Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    value={formData.alertThreshold}
                    onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                    placeholder="80"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="alertEnabled"
                    checked={formData.alertEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, alertEnabled: checked })}
                  />
                  <Label htmlFor="alertEnabled">{t("table.enableAlerts") || "Enable Alerts"}</Label>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("action.cancel") || "Cancel"}
                </Button>
                <Button onClick={handleSubmit}>
                  {editingBudget ? t("action.save") || "Save" : t("action.create") || "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      }}
      summaryCards={[
        {
          title: t("table.totalBudget") || "Total Budget",
          value: `$${totalBudget.toFixed(2)}`,
          icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: t("table.totalSpent") || "Total Spent",
          value: `$${totalSpent.toFixed(2)}`,
          icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: t("table.activeBudgets") || "Active Budgets",
          value: activeBudgets.toString(),
          icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: t("table.exceeded") || "Exceeded",
          value: exceededBudgets.toString(),
          icon: <XCircle className="h-4 w-4 text-muted-foreground" />
        }
      ]}
    >
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("budget.search") || "Search budgets..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardContent>
          {filteredBudgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("budget.noBudgets") || "No budgets found."}</p>
              <p className="text-sm mt-2">
                {t("budget.createFirst") || "Create your first budget to get started."}
              </p>
            </div>
          ) : (
            <ResizableTable
              defaultColumnWidths={{
                name: 150,
                limit: 100,
                spent: 100,
                progress: 150,
                period: 100,
                alert: 120,
                status: 100,
                actions: 120
              }}
            >
              <TableHeader>
                <TableRow>
                  <ResizableTableHead columnId="name" defaultWidth={150}>
                    {t("table.name")}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="limit" defaultWidth={100}>
                    {t("table.limit") || "Limit"}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="spent" defaultWidth={100}>
                    {t("table.spent") || "Spent"}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="progress" defaultWidth={150}>
                    {t("table.progress") || "Progress"}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="period" defaultWidth={100}>
                    {t("table.period")}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="alert" defaultWidth={120}>
                    {t("table.alert") || "Alert"}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="status" defaultWidth={100}>
                    {t("table.status")}
                  </ResizableTableHead>
                  <ResizableTableHead columnId="actions" defaultWidth={120}>
                    {t("table.actions")}
                  </ResizableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.map((budget) => {
                  const percentage = (budget.spent / budget.limit) * 100
                  return (
                    <TableRow key={budget.id}>
                      <ResizableTableCell className="font-medium">{budget.name}</ResizableTableCell>
                      <ResizableTableCell>${budget.limit.toFixed(2)}</ResizableTableCell>
                      <ResizableTableCell>${budget.spent.toFixed(2)}</ResizableTableCell>
                      <ResizableTableCell>
                        <div className="space-y-1">
                          <Progress value={Math.min(percentage, 100)} className="h-2" />
                          <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                        </div>
                      </ResizableTableCell>
                      <ResizableTableCell className="capitalize">{t(`table.${budget.period}`) || budget.period}</ResizableTableCell>
                      <ResizableTableCell>
                        <div className="flex items-center space-x-2">
                          <Switch checked={budget.alertEnabled} onCheckedChange={() => toggleAlert(budget.id)} />
                          <span className="text-sm text-gray-500">{budget.alertThreshold}%</span>
                        </div>
                      </ResizableTableCell>
                      <ResizableTableCell>
                        <Badge className={getStatusColor(budget.status)}>
                          {budget.status === "exceeded" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {t(`table.${budget.status}`) || budget.status}
                        </Badge>
                      </ResizableTableCell>
                      <ResizableTableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(budget)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(budget)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </ResizableTableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </ResizableTable>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tReplace(t("dialog.delete.title"), { itemType: t("action.createBudget") })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{tReplace(t("dialog.delete.desc"), { itemType: t("action.createBudget").toLowerCase() })}</p>
            {deleteDialog.budget && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{deleteDialog.budget.name}</p>
                <p className="text-sm text-gray-600">
                  {t("table.limit")}: ${deleteDialog.budget.limit.toFixed(2)} | {t("table.spent")}: ${deleteDialog.budget.spent.toFixed(2)}
                </p>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={cancelDelete}>
                {t("dialog.delete.cancel")}
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                {t("dialog.delete.delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

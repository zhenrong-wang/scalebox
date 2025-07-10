"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "../contexts/language-context"
import { tReplace } from "../lib/i18n"

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

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
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
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">${totalBudget.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">{t("table.totalBudget") || "Total Budget"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">{t("table.totalSpent")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{activeBudgets}</div>
          <div className="text-sm text-muted-foreground">{t("table.activeBudgets") || "Active Budgets"}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{exceededBudgets}</div>
          <div className="text-sm text-muted-foreground">{t("table.exceeded") || "Exceeded"}</div>
        </div>
      </div>

      {/* Create Budget Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">{t("account.budgetManagement")}</h2>
          <p className="text-sm text-muted-foreground">{t("account.setLimits")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t("action.createBudget")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBudget ? t("action.edit") + " " + t("action.createBudget") : t("action.createBudget")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="budgetName">{t("table.name")}</Label>
                <Input
                  id="budgetName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("table.name")}
                />
              </div>
              <div>
                <Label htmlFor="budgetLimit">{t("table.limit") || "Budget Limit ($)"}</Label>
                <Input
                  id="budgetLimit"
                  type="number"
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                  placeholder={t("table.limit") || "Enter budget limit"}
                />
              </div>
              <div>
                <Label htmlFor="budgetPeriod">{t("table.period")}</Label>
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
                  min="1"
                  max="100"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                  placeholder={t("table.alertThreshold") || "Enter alert threshold"}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.alertEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, alertEnabled: checked })}
                />
                <Label>{t("account.enableAlerts")}</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingBudget ? t("action.update") : t("action.createBudget")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budgets Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.limit") || "Limit"}</TableHead>
              <TableHead>{t("table.spent") || "Spent"}</TableHead>
              <TableHead>{t("table.progress") || "Progress"}</TableHead>
              <TableHead>{t("table.period")}</TableHead>
              <TableHead>{t("table.alert") || "Alert"}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => {
              const percentage = (budget.spent / budget.limit) * 100
              return (
                <TableRow key={budget.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{budget.name}</TableCell>
                  <TableCell>${budget.limit.toFixed(2)}</TableCell>
                  <TableCell>${budget.spent.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={Math.min(percentage, 100)} className="h-2" />
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{t(`table.${budget.period}`) || budget.period}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch checked={budget.alertEnabled} onCheckedChange={() => toggleAlert(budget.id)} />
                      <span className="text-sm text-gray-500">{budget.alertThreshold}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(budget.status)}>
                      {budget.status === "exceeded" && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {t(`table.${budget.status}`) || budget.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex space-x-2 justify-end">
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
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

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
    </div>
  )
}

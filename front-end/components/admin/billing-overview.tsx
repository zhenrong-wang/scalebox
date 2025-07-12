"use client"


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "../../contexts/language-context"

// Mock billing data
const revenueStats = {
  totalRevenue: 45230.5,
  monthlyRevenue: 12450.75,
  averagePerUser: 36.25,
  payingUsers: 342,
}

const recentTransactions = [
  { id: "txn_001", user: "john@company.com", amount: 89.5, date: "2024-01-28", status: "completed" },
  { id: "txn_002", user: "sarah@startup.io", amount: 156.3, date: "2024-01-28", status: "completed" },
  { id: "txn_003", user: "mike@agency.com", amount: 234.75, date: "2024-01-27", status: "pending" },
  { id: "txn_004", user: "lisa@freelance.dev", amount: 67.2, date: "2024-01-27", status: "completed" },
]

export function BillingOverview() {
  const { t } = useLanguage()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{revenueStats.totalRevenue}</div>
          <div className="text-sm text-muted-foreground">{t("admin.totalRevenue")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{revenueStats.monthlyRevenue}</div>
          <div className="text-sm text-muted-foreground">{t("admin.monthlyRevenue")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{revenueStats.payingUsers}</div>
          <div className="text-sm text-muted-foreground">{t("admin.payingUsers")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{revenueStats.averagePerUser}</div>
          <div className="text-sm text-muted-foreground">{t("admin.averagePerUser")}</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.recentTransactions")}</CardTitle>
          <CardDescription>{t("admin.latestBillingTransactions")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.transactionId")}</TableHead>
                <TableHead>{t("admin.user")}</TableHead>
                <TableHead>{t("admin.amount")}</TableHead>
                <TableHead>{t("admin.date")}</TableHead>
                <TableHead>{t("admin.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                  <TableCell>{transaction.user}</TableCell>
                  <TableCell className="font-medium">${transaction.amount.toFixed(2)}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(transaction.status)}>{transaction.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

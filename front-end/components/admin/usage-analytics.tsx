"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, TrendingDown, Activity, Users, Database } from "lucide-react"
import { useLanguage } from "../../contexts/language-context"

// Mock analytics data
const topUsers = [
  { name: "John Developer", email: "john@company.com", usage: 892.5, trend: "+15%" },
  { name: "Sarah Tech", email: "sarah@startup.io", usage: 654.2, trend: "+8%" },
  { name: "Mike Builder", email: "mike@agency.com", usage: 543.1, trend: "-2%" },
  { name: "Lisa Coder", email: "lisa@freelance.dev", usage: 432.8, trend: "+22%" },
]

const topProjects = [
  { name: "E-commerce Platform", owner: "john@company.com", sandboxes: 12, spent: 456.3 },
  { name: "Mobile App Backend", owner: "sarah@startup.io", sandboxes: 8, spent: 234.5 },
  { name: "Analytics Dashboard", owner: "mike@agency.com", sandboxes: 6, spent: 189.2 },
  { name: "Payment Gateway", owner: "lisa@freelance.dev", sandboxes: 5, spent: 167.8 },
]

// Add mock values for usage stats
const totalSessions = 12890
const activeSessions = 342
const peakUsage = 1024
const averageUsage = 512

export function UsageAnalytics() {
  const { t } = useLanguage()
  const [timeRange, setTimeRange] = useState("30d")

  const exportToCSV = () => {
    // Create CSV data from backend analytics
    const csvData = [
      ["User", "Email", "Usage (hours)", "Trend", "Projects", "Total Spent"],
      ...topUsers.map(user => [
        user.name,
        user.email,
        user.usage.toString(),
        user.trend,
        topProjects.filter(p => p.owner === user.email).length.toString(),
        topProjects.filter(p => p.owner === user.email).reduce((sum, p) => sum + p.spent, 0).toFixed(2)
      ]),
      [],
      ["Project", "Owner", "Sandboxes", "Spent"],
      ...topProjects.map(project => [
        project.name,
        project.owner,
        project.sandboxes.toString(),
        project.spent.toString()
      ])
    ]

    const csvContent = csvData.map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `usage-analytics-${timeRange}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t("admin.usageAnalytics") || "Usage Analytics"}</h2>
          <p className="text-muted-foreground">{t("admin.usageAnalyticsDesc") || "Monitor platform usage and user activity"}</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            {t("admin.exportCSV") || "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.totalSessions") || "Total Sessions"}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t("admin.allTime") || "All time"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.activeSessions") || "Active Sessions"}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions}</div>
            <p className="text-xs text-muted-foreground">{t("admin.currentlyActive") || "Currently active"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.peakUsage") || "Peak Usage"}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peakUsage}</div>
            <p className="text-xs text-muted-foreground">{t("admin.concurrentUsers") || "Concurrent users"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.averageUsage") || "Average Usage"}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageUsage}</div>
            <p className="text-xs text-muted-foreground">{t("admin.dailyAverage") || "Daily average"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.topUsers") || "Top Users"}</CardTitle>
          <CardDescription>{t("admin.mostActiveUsers") || "Most active users by usage"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name") || "Name"}</TableHead>
                <TableHead>{t("table.email") || "Email"}</TableHead>
                <TableHead>{t("table.usage") || "Usage (hours)"}</TableHead>
                <TableHead>{t("table.trend") || "Trend"}</TableHead>
                <TableHead>{t("table.projects") || "Projects"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUsers.map((user, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.usage.toFixed(1)}</TableCell>
                  <TableCell>
                    <Badge variant={user.trend.startsWith("+") ? "default" : "secondary"}>
                      {user.trend.startsWith("+") ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {user.trend}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {topProjects.filter(p => p.owner === user.email).length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.topProjects") || "Top Projects"}</CardTitle>
          <CardDescription>{t("admin.mostResourceIntensive") || "Most resource-intensive projects"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name") || "Name"}</TableHead>
                <TableHead>{t("table.owner") || "Owner"}</TableHead>
                <TableHead>{t("table.sandboxes") || "Sandboxes"}</TableHead>
                <TableHead>{t("table.spent") || "Spent"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProjects.map((project, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.owner}</TableCell>
                  <TableCell>{project.sandboxes}</TableCell>
                  <TableCell>${project.spent.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

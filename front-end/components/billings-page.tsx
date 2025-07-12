"use client"

import { useState, useMemo } from "react"
import { DollarSign, Clock, Database, Zap, Download, Calendar, BarChart3, TrendingUp, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "../contexts/language-context"
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts'
import { ResizableTable, ResizableTableHead, ResizableTableCell } from "@/components/ui/resizable-table"
import { TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { PageLayout } from "@/components/ui/page-layout"
import { SearchFilters } from "@/components/ui/search-filters"

interface UsageRecord {
  id: string
  month: string
  sandboxHours: number
  apiCalls: number
  storage: number
  amount: number
  status: "paid" | "pending" | "overdue"
  projectId?: string
  projectName?: string
}

interface UsageDataPoint {
  date: string
  sandboxQuantity: number
  sandboxCores: number
  sandboxRAM: number
  sandboxStorage: number
  projectId?: string
  projectName?: string
}

interface AggregatedDataPoint extends UsageDataPoint {
  [key: string]: string | number | undefined
}

// Mock data for historical usage - 30 days of data for better chart visualization
const historicalUsageData: UsageDataPoint[] = [
  { date: "2025-01-01", sandboxQuantity: 3, sandboxCores: 8, sandboxRAM: 16, sandboxStorage: 50, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-02", sandboxQuantity: 4, sandboxCores: 12, sandboxRAM: 24, sandboxStorage: 75, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-03", sandboxQuantity: 2, sandboxCores: 4, sandboxRAM: 8, sandboxStorage: 25, projectId: "proj_002", projectName: "Mobile App Backend" },
  { date: "2025-01-04", sandboxQuantity: 5, sandboxCores: 16, sandboxRAM: 32, sandboxStorage: 100, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-05", sandboxQuantity: 1, sandboxCores: 2, sandboxRAM: 4, sandboxStorage: 10, projectId: "proj_003", projectName: "Analytics Dashboard" },
  { date: "2025-01-06", sandboxQuantity: 3, sandboxCores: 8, sandboxRAM: 16, sandboxStorage: 50, projectId: "proj_002", projectName: "Mobile App Backend" },
  { date: "2025-01-07", sandboxQuantity: 4, sandboxCores: 12, sandboxRAM: 24, sandboxStorage: 75, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-08", sandboxQuantity: 2, sandboxCores: 6, sandboxRAM: 12, sandboxStorage: 30, projectId: "proj_003", projectName: "Analytics Dashboard" },
  { date: "2025-01-09", sandboxQuantity: 6, sandboxCores: 20, sandboxRAM: 40, sandboxStorage: 120, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-10", sandboxQuantity: 3, sandboxCores: 8, sandboxRAM: 16, sandboxStorage: 50, projectId: "proj_002", projectName: "Mobile App Backend" },
  { date: "2025-01-11", sandboxQuantity: 4, sandboxCores: 12, sandboxRAM: 24, sandboxStorage: 75, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-12", sandboxQuantity: 1, sandboxCores: 2, sandboxRAM: 4, sandboxStorage: 10, projectId: "proj_003", projectName: "Analytics Dashboard" },
  { date: "2025-01-13", sandboxQuantity: 5, sandboxCores: 16, sandboxRAM: 32, sandboxStorage: 100, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-14", sandboxQuantity: 2, sandboxCores: 4, sandboxRAM: 8, sandboxStorage: 25, projectId: "proj_002", projectName: "Mobile App Backend" },
  { date: "2025-01-15", sandboxQuantity: 3, sandboxCores: 8, sandboxRAM: 16, sandboxStorage: 50, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-16", sandboxQuantity: 7, sandboxCores: 24, sandboxRAM: 48, sandboxStorage: 150, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-17", sandboxQuantity: 4, sandboxCores: 10, sandboxRAM: 20, sandboxStorage: 60, projectId: "proj_002", projectName: "Mobile App Backend" },
  { date: "2025-01-18", sandboxQuantity: 2, sandboxCores: 4, sandboxRAM: 8, sandboxStorage: 20, projectId: "proj_003", projectName: "Analytics Dashboard" },
  { date: "2025-01-19", sandboxQuantity: 8, sandboxCores: 28, sandboxRAM: 56, sandboxStorage: 180, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-20", sandboxQuantity: 5, sandboxCores: 14, sandboxRAM: 28, sandboxStorage: 80, projectId: "proj_002", projectName: "Mobile App Backend" },
  { date: "2025-01-21", sandboxQuantity: 3, sandboxCores: 6, sandboxRAM: 12, sandboxStorage: 35, projectId: "proj_003", projectName: "Analytics Dashboard" },
  { date: "2025-01-22", sandboxQuantity: 6, sandboxCores: 18, sandboxRAM: 36, sandboxStorage: 110, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-23", sandboxQuantity: 4, sandboxCores: 12, sandboxRAM: 24, sandboxStorage: 70, projectId: "proj_002", projectName: "Mobile App Backend" },
  { date: "2025-01-24", sandboxQuantity: 1, sandboxCores: 2, sandboxRAM: 4, sandboxStorage: 15, projectId: "proj_003", projectName: "Analytics Dashboard" },
  { date: "2025-01-25", sandboxQuantity: 9, sandboxCores: 32, sandboxRAM: 64, sandboxStorage: 200, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-26", sandboxQuantity: 6, sandboxCores: 16, sandboxRAM: 32, sandboxStorage: 90, projectId: "proj_002", projectName: "Mobile App Backend" },
  { date: "2025-01-27", sandboxQuantity: 2, sandboxCores: 4, sandboxRAM: 8, sandboxStorage: 25, projectId: "proj_003", projectName: "Analytics Dashboard" },
  { date: "2025-01-28", sandboxQuantity: 7, sandboxCores: 22, sandboxRAM: 44, sandboxStorage: 130, projectId: "proj_001", projectName: "E-commerce Platform" },
  { date: "2025-01-29", sandboxQuantity: 5, sandboxCores: 14, sandboxRAM: 28, sandboxStorage: 85, projectId: "proj_002", projectName: "Mobile App Backend" },
  { date: "2025-01-30", sandboxQuantity: 3, sandboxCores: 6, sandboxRAM: 12, sandboxStorage: 40, projectId: "proj_003", projectName: "Analytics Dashboard" },
]

const usageData: UsageRecord[] = [
  {
    id: "bill-001",
    month: "January 2024",
    sandboxHours: 45.5,
    apiCalls: 12500,
    storage: 2.3,
    amount: 89.5,
    status: "paid",
  },
  {
    id: "bill-002",
    month: "December 2023",
    sandboxHours: 38.2,
    apiCalls: 9800,
    storage: 1.9,
    amount: 72.3,
    status: "paid",
  },
  {
    id: "bill-003",
    month: "November 2023",
    sandboxHours: 52.1,
    apiCalls: 15200,
    storage: 2.8,
    amount: 98.75,
    status: "paid",
  },
  {
    id: "bill-004",
    month: "October 2023",
    sandboxHours: 29.8,
    apiCalls: 8500,
    storage: 1.5,
    amount: 56.2,
    status: "paid",
  },
  {
    id: "bill-005",
    month: "September 2023",
    sandboxHours: 41.2,
    apiCalls: 11200,
    storage: 2.1,
    amount: 78.9,
    status: "paid",
  },
]

const currentUsage = {
  sandboxHours: { used: 23.5, limit: 100 },
  apiCalls: { used: 7500, limit: 50000 },
  storage: { used: 1.2, limit: 10 },
}



export function BillingsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedMetric, setSelectedMetric] = useState<string>("sandboxQuantity")
  const [timeInterval, setTimeInterval] = useState<string>("7d")
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [showAnalytics, setShowAnalytics] = useState(false)
  const { t } = useLanguage()

  const filteredUsageData = usageData.filter((record) => {
    const matchesSearch = record.month.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || record.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalSpent = usageData.reduce((sum, usage) => sum + usage.amount, 0)
  const currentMonthEstimate = 45.2
  const averageMonthly = totalSpent / usageData.length

  // Filter historical data based on time interval and project
  const filteredHistoricalData = useMemo(() => {
    let filtered = historicalUsageData

    // Filter by time interval
    const now = new Date()
    const daysToSubtract = timeInterval === "7d" ? 7 : timeInterval === "30d" ? 30 : timeInterval === "90d" ? 90 : 365
    const cutoffDate = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000))
    
    filtered = filtered.filter(item => new Date(item.date) >= cutoffDate)

    // Filter by project
    if (selectedProject !== "all") {
      filtered = filtered.filter(item => item.projectId === selectedProject)
    }

    return filtered
  }, [timeInterval, selectedProject])

  // Aggregate data for charts
  const aggregatedData = useMemo(() => {
    const aggregated = filteredHistoricalData.reduce((acc, item) => {
      const date = item.date
      if (!acc[date]) {
        acc[date] = {
          date,
          sandboxQuantity: 0,
          sandboxCores: 0,
          sandboxRAM: 0,
          sandboxStorage: 0,
        }
      }
      acc[date].sandboxQuantity += item.sandboxQuantity
      acc[date].sandboxCores += item.sandboxCores
      acc[date].sandboxRAM += item.sandboxRAM
      acc[date].sandboxStorage += item.sandboxStorage
      return acc
    }, {} as Record<string, AggregatedDataPoint>)

    return Object.values(aggregated).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [filteredHistoricalData])



  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "sandboxQuantity": return t("billings.sandboxQuantity")
      case "sandboxCores": return t("billings.sandboxCores")
      case "sandboxRAM": return t("billings.sandboxRAM") + " (GB)"
      case "sandboxStorage": return t("billings.sandboxStorage") + " (GB)"
      default: return metric
    }
  }

  const exportToCSV = () => {
    const headers = ["Date", "Project", getMetricLabel(selectedMetric)]
    const csvContent = [
      headers.join(","),
      ...aggregatedData.map(row => [
        row.date,
        selectedProject === "all" ? "All Projects" : selectedProject,
        row[selectedMetric]
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `usage-${selectedMetric}-${timeInterval}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <PageLayout
      header={{
        description: t("billings.monitorUsage"),
        children: (
          <div className="flex gap-2">
            <Button
              variant={showAnalytics ? "default" : "outline"}
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showAnalytics ? t("billings.hideAnalytics") || "Hide Analytics" : t("billings.showAnalytics") || "Show Analytics"}
            </Button>
            {showAnalytics && (
              <Button onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        )
      }}
      summaryCards={[
        {
          title: t("billings.thisMonth") || "This Month",
          value: `$${currentMonthEstimate}`,
          icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: t("billings.totalSpent") || "Total Spent",
          value: `$${totalSpent.toFixed(2)}`,
          icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: t("billings.averageMonthly") || "Average Monthly",
          value: `$${averageMonthly.toFixed(2)}`,
          icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />
        },
        {
          title: t("billings.activeSandboxes") || "Active Sandboxes",
          value: "4",
          icon: <Activity className="h-4 w-4 text-muted-foreground" />
        }
      ]}
    >
      {/* Usage Analytics - Only shown when toggled */}
      {showAnalytics && (
        <>
          {/* Current Usage Details */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("billings.sandboxHours") || "Sandbox Hours"}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentUsage.sandboxHours.used}h</div>
                <div className="text-xs text-muted-foreground mb-2">{`of ${currentUsage.sandboxHours.limit}h limit`}</div>
                <Progress value={(currentUsage.sandboxHours.used / currentUsage.sandboxHours.limit) * 100} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("billings.apiCalls") || "API Calls"}</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentUsage.apiCalls.used.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mb-2">{`of ${currentUsage.apiCalls.limit.toLocaleString()} limit`}</div>
                <Progress value={(currentUsage.apiCalls.used / currentUsage.apiCalls.limit) * 100} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("billings.storage") || "Storage"}</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentUsage.storage.used}GB</div>
                <div className="text-xs text-muted-foreground mb-2">{`of ${currentUsage.storage.limit}GB limit`}</div>
                <Progress value={(currentUsage.storage.used / currentUsage.storage.limit) * 100} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Usage Analytics Charts */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("billings.usageAnalytics")}</CardTitle>
                  <CardDescription>{t("billings.historicalPatterns")}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-48">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandboxQuantity">{t("billings.sandboxQuantity")}</SelectItem>
                      <SelectItem value="sandboxCores">{t("billings.sandboxCores")}</SelectItem>
                      <SelectItem value="sandboxRAM">{t("billings.sandboxRAM")}</SelectItem>
                      <SelectItem value="sandboxStorage">{t("billings.sandboxStorage")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeInterval} onValueChange={setTimeInterval}>
                    <SelectTrigger className="w-32">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="90d">90 days</SelectItem>
                      <SelectItem value="1y">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-48">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="proj_001">E-commerce Platform</SelectItem>
                      <SelectItem value="proj_002">Mobile App Backend</SelectItem>
                      <SelectItem value="proj_003">Analytics Dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="line" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="line">{t("billings.lineChart")}</TabsTrigger>
                  <TabsTrigger value="area">{t("billings.areaChart")}</TabsTrigger>
                  <TabsTrigger value="bar">{t("billings.barChart")}</TabsTrigger>
                </TabsList>
                <TabsContent value="line" className="mt-4">
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={aggregatedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey={selectedMetric} 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name={getMetricLabel(selectedMetric)}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="area" className="mt-4">
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={aggregatedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey={selectedMetric} 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                        name={getMetricLabel(selectedMetric)}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="bar" className="mt-4">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={aggregatedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey={selectedMetric} 
                        fill="#8884d8" 
                        name={getMetricLabel(selectedMetric)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}



      {/* Billing History */}
      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t("billings.search") || "Search billing records..."}
        filters={[
          {
            key: "status",
            label: t("table.selectStatus") || "Filter by status",
            value: statusFilter,
            onValueChange: setStatusFilter,
            options: [
              { value: "all", label: t("table.allStatus") || "All Status" },
              { value: "paid", label: t("table.paid") || "Paid" },
              { value: "pending", label: t("table.pending") || "Pending" },
              { value: "overdue", label: t("table.overdue") || "Overdue" }
            ]
          }
        ]}
      />

      <Card>
        <CardContent>
          {/* Billing Table */}
          <ResizableTable
            defaultColumnWidths={{
              period: 150,
              sandboxHours: 120,
              apiCalls: 120,
              storage: 120,
              amount: 120,
              status: 100
            }}
          >
            <TableHeader>
              <TableRow>
                <ResizableTableHead columnId="period" defaultWidth={150}>{t("billings.period") || "Period"}</ResizableTableHead>
                <ResizableTableHead columnId="sandboxHours" defaultWidth={120}>{t("billings.sandboxHours") || "Sandbox Hours"}</ResizableTableHead>
                <ResizableTableHead columnId="apiCalls" defaultWidth={120}>{t("billings.apiCalls") || "API Calls"}</ResizableTableHead>
                <ResizableTableHead columnId="storage" defaultWidth={120}>{t("billings.storage") || "Storage (GB)"}</ResizableTableHead>
                <ResizableTableHead columnId="amount" defaultWidth={120}>{t("billings.amount") || "Amount"}</ResizableTableHead>
                <ResizableTableHead columnId="status" defaultWidth={100}>{t("billings.status") || "Status"}</ResizableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsageData.map((record) => (
                <TableRow key={record.id}>
                  <ResizableTableCell className="font-medium">{record.month}</ResizableTableCell>
                  <ResizableTableCell>{record.sandboxHours}h</ResizableTableCell>
                  <ResizableTableCell>{record.apiCalls.toLocaleString()}</ResizableTableCell>
                  <ResizableTableCell>{record.storage}GB</ResizableTableCell>
                  <ResizableTableCell>${record.amount.toFixed(2)}</ResizableTableCell>
                  <ResizableTableCell>
                    <Badge className={getStatusColor(record.status)}>
                      {t(`table.${record.status}`) || record.status}
                    </Badge>
                  </ResizableTableCell>
                </TableRow>
              ))}
            </TableBody>
          </ResizableTable>
        </CardContent>
      </Card>
    </PageLayout>
  )
}

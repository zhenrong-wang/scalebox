"use client"

import { useState } from "react"
import { DollarSign, Users, FolderOpen, TrendingUp, Download, Filter, Calendar } from "lucide-react"
import { useLanguage } from "../../contexts/language-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

// Mock comprehensive billing data
const overallStats = {
  totalRevenue: 45230.5,
  monthlyRevenue: 12450.75,
  totalUsers: 1247,
  activeUsers: 892,
  totalProjects: 3421,
  activeProjects: 2156,
  avgRevenuePerUser: 36.25,
  avgRevenuePerProject: 13.22,
}

const userBillingData = [
  {
    userId: "user_123456",
    userName: "John Developer",
    userEmail: "john@company.com",
    totalSpent: 892.5,
    monthlySpent: 234.5,
    projectCount: 4,
    sandboxHours: 45.2,
    apiCalls: 12500,
    storageGB: 2.3,
    lastActivity: "2 hours ago",
  },
  {
    userId: "user_789012",
    userName: "Sarah Tech",
    userEmail: "sarah@startup.io",
    totalSpent: 654.2,
    monthlySpent: 189.3,
    projectCount: 2,
    sandboxHours: 38.7,
    apiCalls: 8900,
    storageGB: 1.8,
    lastActivity: "1 day ago",
  },
  {
    userId: "user_345678",
    userName: "Mike Builder",
    userEmail: "mike@agency.com",
    totalSpent: 543.1,
    monthlySpent: 156.8,
    projectCount: 6,
    sandboxHours: 52.1,
    apiCalls: 15200,
    storageGB: 3.1,
    lastActivity: "3 hours ago",
  },
]

const projectBillingData = [
  {
    projectId: "proj_001",
    projectName: "E-commerce Platform",
    ownerName: "John Developer",
    ownerEmail: "john@company.com",
    totalSpent: 456.3,
    monthlySpent: 123.5,
    sandboxCount: 8,
    sandboxHours: 28.5,
    apiCalls: 7500,
    storageGB: 1.5,
    lastActivity: "1 hour ago",
  },
  {
    projectId: "proj_002",
    projectName: "Mobile App Backend",
    ownerName: "Sarah Tech",
    ownerEmail: "sarah@startup.io",
    totalSpent: 234.5,
    monthlySpent: 89.2,
    sandboxCount: 4,
    sandboxHours: 19.3,
    apiCalls: 4200,
    storageGB: 0.8,
    lastActivity: "2 hours ago",
  },
  {
    projectId: "proj_003",
    projectName: "Analytics Dashboard",
    ownerName: "Mike Builder",
    ownerEmail: "mike@agency.com",
    totalSpent: 189.2,
    monthlySpent: 67.8,
    sandboxCount: 3,
    sandboxHours: 15.7,
    apiCalls: 3100,
    storageGB: 0.6,
    lastActivity: "5 hours ago",
  },
]

const resourceAllocation = {
  byResourceType: [
    { type: "Sandbox Hours", usage: 2847, cost: 8541.0, percentage: 68.5 },
    { type: "API Calls", usage: 1247392, cost: 2494.78, percentage: 20.0 },
    { type: "Storage", usage: 156.7, cost: 1567.0, percentage: 12.6 },
    { type: "Data Transfer", usage: 89.2, cost: 892.0, percentage: 7.2 },
  ],
  byUserTier: [
    { tier: "Enterprise", users: 23, revenue: 18450.5, percentage: 41.2 },
    { tier: "Professional", users: 156, revenue: 15620.3, percentage: 34.8 },
    { tier: "Starter", users: 713, revenue: 10759.7, percentage: 24.0 },
  ],
}

export function AdminBillingAnalytics() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("30days")
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [projectSearchTerm, setProjectSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("totalSpent")

  const filteredUserData = userBillingData
    .filter(
      (user) =>
        user.userName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.userEmail.toLowerCase().includes(userSearchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "totalSpent":
          return b.totalSpent - a.totalSpent
        case "monthlySpent":
          return b.monthlySpent - a.monthlySpent
        case "sandboxHours":
          return b.sandboxHours - a.sandboxHours
        default:
          return 0
      }
    })

  const filteredProjectData = projectBillingData
    .filter(
      (project) =>
        project.projectName.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
        project.ownerName.toLowerCase().includes(projectSearchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "totalSpent":
          return b.totalSpent - a.totalSpent
        case "monthlySpent":
          return b.monthlySpent - a.monthlySpent
        case "sandboxHours":
          return b.sandboxHours - a.sandboxHours
        default:
          return 0
      }
    })

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">Comprehensive view of platform usage and revenue</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overallStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">of {overallStats.totalUsers} total users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">of {overallStats.totalProjects} total projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.avgRevenuePerUser")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overallStats.avgRevenuePerUser}</div>
            <p className="text-xs text-muted-foreground">{t("admin.monthlyAverage")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-users">By Users</TabsTrigger>
          <TabsTrigger value="by-projects">By Projects</TabsTrigger>
          <TabsTrigger value="allocation">Resource Allocation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Users by Spending */}
            <Card>
              <CardHeader>
                <CardTitle>Top Users by Spending</CardTitle>
                <CardDescription>Highest revenue generating users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userBillingData.slice(0, 5).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{user.userName}</div>
                          <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${user.totalSpent.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">{user.projectCount} projects</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Projects by Spending */}
            <Card>
              <CardHeader>
                <CardTitle>Top Projects by Spending</CardTitle>
                <CardDescription>Highest cost projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projectBillingData.slice(0, 5).map((project, index) => (
                    <div key={project.projectId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{project.projectName}</div>
                          <div className="text-sm text-muted-foreground">{project.ownerName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${project.totalSpent.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">{project.sandboxCount} sandboxes</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-users" className="space-y-4">
          {/* User Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Input
                placeholder="Search users by name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalSpent">Total Spent</SelectItem>
                <SelectItem value="monthlySpent">Monthly Spent</SelectItem>
                <SelectItem value="sandboxHours">Sandbox Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Billing Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Monthly Spent</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUserData.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.userName}</div>
                          <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.projectCount} projects</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{user.sandboxHours}h sandbox</div>
                          <div>{user.apiCalls.toLocaleString()} API calls</div>
                          <div>{user.storageGB}GB storage</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${user.monthlySpent.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">${user.totalSpent.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.lastActivity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-projects" className="space-y-4">
          {/* Project Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Input
                placeholder="Search projects by name or owner..."
                value={projectSearchTerm}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalSpent">Total Spent</SelectItem>
                <SelectItem value="monthlySpent">Monthly Spent</SelectItem>
                <SelectItem value="sandboxHours">Sandbox Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project Billing Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Resources</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Monthly Spent</TableHead>
                    <TableHead>Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjectData.map((project) => (
                    <TableRow key={project.projectId}>
                      <TableCell>
                        <div className="font-medium">{project.projectName}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{project.ownerName}</div>
                          <div className="text-sm text-muted-foreground">{project.ownerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{project.sandboxCount} sandboxes</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{project.sandboxHours}h runtime</div>
                          <div>{project.apiCalls.toLocaleString()} API calls</div>
                          <div>{project.storageGB}GB storage</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${project.monthlySpent.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">${project.totalSpent.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Resource Type Allocation */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage Allocation</CardTitle>
                <CardDescription>Breakdown by resource type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resourceAllocation.byResourceType.map((resource) => (
                  <div key={resource.type} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{resource.type}</span>
                      <span>
                        ${resource.cost.toFixed(2)} ({resource.percentage}%)
                      </span>
                    </div>
                    <Progress value={resource.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">Usage: {resource.usage.toLocaleString()} units</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* User Tier Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by User Tier</CardTitle>
                <CardDescription>Revenue distribution across subscription tiers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resourceAllocation.byUserTier.map((tier) => (
                  <div key={tier.tier} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{tier.tier}</span>
                      <span>
                        ${tier.revenue.toFixed(2)} ({tier.percentage}%)
                      </span>
                    </div>
                    <Progress value={tier.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">{tier.users} users</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

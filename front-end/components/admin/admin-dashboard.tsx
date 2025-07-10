"use client"

import { useState } from "react"
import { Users, DollarSign, Activity, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagement } from "./user-management"
import { UsageAnalytics } from "./usage-analytics"
import { BillingOverview } from "./billing-overview"
import { SystemHealth } from "./system-health"
import { AdminApiKeyManagement } from "./api-key-management"
import { useLanguage } from "../../contexts/language-context"

// Mock admin stats
const adminStats = {
  totalUsers: 1247,
  activeUsers: 892,
  totalRevenue: 45230.5,
  monthlyRevenue: 12450.75,
  totalSandboxes: 3421,
  activeSandboxes: 156,
  totalApiCalls: 2847392,
  systemHealth: 99.2,
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      {/* Admin Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">
            {typeof adminStats.totalUsers === "number" ? adminStats.totalUsers : 0}
          </div>
          <div className="text-sm text-muted-foreground">{t("admin.totalUsers")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">
            ${typeof adminStats.monthlyRevenue === "number" ? adminStats.monthlyRevenue.toFixed(2) : "0.00"}
          </div>
          <div className="text-sm text-muted-foreground">{t("admin.monthlyRevenue")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">
            {typeof adminStats.activeSandboxes === "number" ? adminStats.activeSandboxes : 0}
          </div>
          <div className="text-sm text-muted-foreground">{t("admin.activeSandboxes")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">
            {typeof adminStats.systemHealth === "number" ? adminStats.systemHealth : 0}%
          </div>
          <div className="text-sm text-muted-foreground">{t("admin.systemHealth")}</div>
        </div>
      </div>

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t("admin.overview")}</TabsTrigger>
          <TabsTrigger value="users">{t("admin.userManagement")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("admin.usageAnalytics")}</TabsTrigger>
          <TabsTrigger value="billing">{t("admin.billingOverview")}</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SystemHealth />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <UsageAnalytics />
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <BillingOverview />
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <AdminApiKeyManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

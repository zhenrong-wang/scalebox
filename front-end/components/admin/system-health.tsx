"use client"

import { Activity, Server, Database, Zap, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import { useLanguage } from "../../contexts/language-context"

// Mock system health data
const systemMetrics = {
  uptime: 99.2,
  responseTime: 145,
  activeConnections: 1247,
  errorRate: 0.03,
  cpuUsage: 68,
  memoryUsage: 72,
  diskUsage: 45,
  networkTraffic: 2.4,
}

const systemAlerts = [
  { id: 1, type: "warning", message: "High CPU usage detected on server-03", time: "5 minutes ago" },
  { id: 2, type: "info", message: "Database backup completed successfully", time: "1 hour ago" },
  { id: 3, type: "success", message: "All systems operating normally", time: "2 hours ago" },
]

export function SystemHealth() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      {/* System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("system.uptime")}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.uptime}%</div>
            <Progress value={systemMetrics.uptime} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("system.responseTime")}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.responseTime}ms</div>
            <p className="text-xs text-muted-foreground">{t("system.avgResponseTime")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("system.activeConnections")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.activeConnections.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t("system.currentConnections")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("system.errorRate")}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{systemMetrics.errorRate}%</div>
            <p className="text-xs text-muted-foreground">{t("system.errorRateDesc")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("system.resourceUsage")}</CardTitle>
            <CardDescription>{t("system.resourceUsageDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{t("system.cpuUsage")}</span>
                <span>{systemMetrics.cpuUsage}%</span>
              </div>
              <Progress value={systemMetrics.cpuUsage} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{t("system.memoryUsage")}</span>
                <span>{systemMetrics.memoryUsage}%</span>
              </div>
              <Progress value={systemMetrics.memoryUsage} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{t("system.diskUsage")}</span>
                <span>{systemMetrics.diskUsage}%</span>
              </div>
              <Progress value={systemMetrics.diskUsage} />
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <div className="space-y-2">
          {systemAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-2">
              {alert.type === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
              {alert.type === "info" && <Info className="h-4 w-4 text-blue-600" />}
              {alert.type === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
              <span className="font-medium">{t(`system.alert.${alert.type}`)}</span>
              <span>{t(`system.alertMsg.${alert.id}`) || alert.message}</span>
              <span className="text-xs text-muted-foreground">{alert.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

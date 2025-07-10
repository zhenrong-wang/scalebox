"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{totalSessions}</div>
          <div className="text-sm text-muted-foreground">{t("admin.totalSessions")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{activeSessions}</div>
          <div className="text-sm text-muted-foreground">{t("admin.activeSessions")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{peakUsage}</div>
          <div className="text-sm text-muted-foreground">{t("admin.peakUsage")}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{averageUsage}</div>
          <div className="text-sm text-muted-foreground">{t("admin.averageUsage")}</div>
        </div>
      </div>
      {/* Add more usage analytics content here, using t() for all user-facing text */}
    </div>
  )
}

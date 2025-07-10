"use client"

import { useState, useEffect } from "react"
import { X, User, DollarSign, Activity } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserService } from "@/services/user-service"
import { useLanguage } from "../../contexts/language-context"

interface UserDetailsModalProps {
  userId: string
  onClose: () => void
}

export function UserDetailsModal({ userId, onClose }: UserDetailsModalProps) {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const users = UserService.getAllUsers()
    const foundUser = users.find((u) => u.id === userId)
    setUser(foundUser)
  }, [userId])

  if (!user) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "disabled":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "suspended":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getRoleColor = (role: string) => {
    return role === "admin"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : "bg-blue-100 text-blue-800 border-blue-200"
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            <span>{user.name}</span>
            <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
            <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("admin.basicInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <p className="text-sm font-mono">{user.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">{new Date(user.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                  <p className="text-sm">{new Date(user.lastLoginAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t("admin.usageStatistics")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{user.currentUsage.projects}</div>
                  <p className="text-sm text-muted-foreground">{t("admin.projects")}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{user.currentUsage.sandboxes}</div>
                  <p className="text-sm text-muted-foreground">{t("admin.sandboxes")}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{user.currentUsage.apiKeys}</div>
                  <p className="text-sm text-muted-foreground">{t("table.apiKeys")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t("admin.billingInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold">${user.totalSpent.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">{t("admin.totalSpent")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Server,
  Clock,
  Activity,
  AlertTriangle,
} from "lucide-react"
import type { Sandbox } from "../../types/sandbox"
import { useLanguage } from "../../contexts/language-context"

interface SandboxDetailsModalProps {
  sandbox: Sandbox
  isOpen: boolean
  onClose: () => void
}

export function SandboxDetailsModal({ sandbox, isOpen, onClose }: SandboxDetailsModalProps) {

  const formatUptime = (minutes: number) => {
    if (minutes === 0) return "Not running"

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours === 0) {
      return `${remainingMinutes}m`
    } else if (remainingMinutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${remainingMinutes}m`
    }
  }



  const { t } = useLanguage()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.sandboxDetails")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Sandbox Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5" />
                {t("admin.sandboxInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">{t("admin.name")}</div>
                  <div className="font-medium">{sandbox.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("admin.framework")}</div>
                  <div className="font-medium">{sandbox.framework}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("admin.status")}</div>
                  <div className="font-medium">{t(`admin.status.${sandbox.status}`) || sandbox.status}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("admin.user")}</div>
                  <div className="font-medium">{sandbox.userName}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("admin.region")}</div>
                  <div className="font-medium">{sandbox.region}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("admin.visibility")}</div>
                  <div className="font-medium">{t(`admin.visibility.${sandbox.visibility}`) || sandbox.visibility}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Runtime Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("admin.runtimeStats")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("admin.uptime")}</span>
                  </div>
                  <div className="text-2xl font-bold">{formatUptime(sandbox.uptime)}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("admin.requests")}</span>
                  </div>
                  <div className="text-2xl font-bold">N/A</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("admin.errors")}</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">N/A</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t("admin.errorRate")}</span>
                  </div>
                  <div className="text-2xl font-bold">N/A</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

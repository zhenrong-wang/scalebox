"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  FolderOpen,
  Code,
  FileText,
  Key,
  CreditCard,
  Receipt,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3,
  Activity,
  Container,
  Book,
} from "lucide-react"
import type { PageType } from "../dashboard"
import { useLanguage } from "../contexts/language-context"

interface SidebarProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  sidebarWidth: number
  onLogout: () => void
  isAdmin: boolean
}

export function Sidebar({
  currentPage,
  onPageChange,
  isCollapsed,
  onToggleCollapse,
  sidebarWidth,
  onLogout,
  isAdmin,
}: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const { t } = useLanguage()

  const userMenuItems = [
    { id: "projects", label: t("nav.projects"), icon: FolderOpen },
    { id: "sandboxes", label: t("nav.sandboxes"), icon: Code },
    { id: "templates", label: t("nav.templates"), icon: FileText },
    { id: "api-key", label: t("nav.apiKeys"), icon: Key },
    { id: "budget", label: t("nav.budget"), icon: CreditCard },
    { id: "billings", label: t("nav.billings"), icon: Receipt },
  ]

  const adminMenuItems = [
    { id: "admin", label: t("nav.dashboard"), icon: LayoutDashboard },
    { id: "users", label: t("nav.users"), icon: Users },
    { id: "sandbox-management", label: t("nav.sandboxManagement"), icon: Container },
    { id: "admin-billing", label: t("nav.analytics"), icon: BarChart3 },
    { id: "system", label: t("nav.systemHealth"), icon: Activity },
    { id: "admin-api-keys", label: t("nav.apiKeys"), icon: Key },
  ]

  const menuItems = isAdmin ? adminMenuItems : userMenuItems

  const MenuItem = ({ item }: { item: any }) => {
    const isActive = currentPage === item.id
    const Icon = item.icon

    return (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={`w-full justify-start h-10 px-3 ${isCollapsed ? "px-2" : ""} ${isActive ? "bg-secondary" : ""}`}
        onClick={() => onPageChange(item.id as PageType)}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <Icon className={`h-4 w-4 ${isCollapsed ? "" : "mr-3"} flex-shrink-0`} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border" style={{ height: '73px' }}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Code className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold text-sm">ScaleBox</div>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="h-8 w-8 p-0">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border">
         <div className="space-y-1">
           <a
             href="https://docs.example.com" // Replace with your actual documentation URL
             target="_blank"
             rel="noopener noreferrer"
           >
             <Button
               variant="ghost"
               className={`w-full justify-start h-10 px-3 ${isCollapsed ? "px-2" : ""}`}
             >
               <Book className={`h-4 w-4 ${isCollapsed ? "" : "mr-3"} flex-shrink-0`} />
               {!isCollapsed && <span>{t("nav.docs")}</span>}
             </Button>
           </a>
           <Button
             variant="ghost"
             className={`w-full justify-start h-10 px-3 ${
               isCollapsed ? "px-2" : ""
             } text-red-600 hover:text-red-700 hover:bg-red-50`}
             onClick={onLogout}
           >
             <LogOut className={`h-4 w-4 ${isCollapsed ? "" : "mr-3"} flex-shrink-0`} />
             {!isCollapsed && <span>{t("nav.logout")}</span>}
           </Button>
         </div>
       </div>
    </div>
  )
}

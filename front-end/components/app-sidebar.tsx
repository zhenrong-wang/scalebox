"use client"

import type React from "react"

import { Box, CreditCard, Key } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { PageType } from "../dashboard"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentPage: PageType
  onPageChange: (page: PageType) => void
}

const menuItems = [
  {
    title: "Sandboxes",
    icon: Box,
    key: "sandboxes" as PageType,
  },
  {
    title: "API Keys",
    icon: Key,
    key: "api-key" as PageType,
  },
  {
    title: "Billings & Usage",
    icon: CreditCard,
    key: "billings" as PageType,
  },
]

export function AppSidebar({ currentPage, onPageChange, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Box className="h-4 w-4" />
          </div>
          <span className="font-semibold">Dashboard</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton isActive={currentPage === item.key} onClick={() => onPageChange(item.key)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

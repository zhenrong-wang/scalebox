import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PageHeaderProps {
  title?: string
  description?: string
  children?: React.ReactNode
}

interface SummaryCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

interface PageLayoutProps {
  header: PageHeaderProps
  summaryCards?: SummaryCardProps[]
  children: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6 border-b">
      <div className="space-y-1">
        {title && (
          <h1 className="text-2xl font-bold">{title}</h1>
        )}
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

export function SummaryCard({ title, value, description, icon, trend }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center text-xs">
            <span className={trend.isPositive ? "text-green-600" : "text-red-600"}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PageLayout({ header, summaryCards, children }: PageLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <PageHeader {...header} />
      
      {/* Summary Cards Section */}
      {summaryCards && summaryCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card, index) => (
            <SummaryCard key={index} {...card} />
          ))}
        </div>
      )}
      
      {/* Components Zone */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
} 
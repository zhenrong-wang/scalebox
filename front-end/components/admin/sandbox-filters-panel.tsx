"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { X } from "lucide-react"
import type { SandboxFilters } from "../../types/sandbox"
import { useLanguage } from "../../contexts/language-context"


interface SandboxFiltersPanelProps {
  filters: SandboxFilters
  onFiltersChange: (filters: SandboxFilters) => void
  onClose: () => void
}

export function SandboxFiltersPanel({ filters, onFiltersChange, onClose }: SandboxFiltersPanelProps) {
  const [localFilters, setLocalFilters] = useState<SandboxFilters>(filters)
  const { t } = useLanguage()

  const statusOptions = [
    { value: "running", label: "Running" },
    { value: "stopped", label: "Stopped" },
    { value: "deleted", label: "Deleted" },
    { value: "error", label: "Error" },
  ]

  const frameworkOptions = [
    { value: "React", label: "React" },
    { value: "Vue", label: "Vue" },
    { value: "Angular", label: "Angular" },
    { value: "Node.js", label: "Node.js" },
    { value: "Python", label: "Python" },
    { value: "Next.js", label: "Next.js" },
  ]

  const regionOptions = [
    { value: "us-east-1", label: "US East (N. Virginia)" },
    { value: "us-west-2", label: "US West (Oregon)" },
    { value: "eu-west-1", label: "Europe (Ireland)" },
    { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  ]

  const visibilityOptions = [
    { value: "public", label: "Public" },
    { value: "private", label: "Private" },
  ]

  const handleCheckboxChange = (
    filterType: "status" | "framework" | "region" | "visibility",
    value: string,
    checked: boolean,
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [filterType]: checked ? [...prev[filterType], value] : prev[filterType].filter((item) => item !== value),
    }))
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const handleClearFilters = () => {
    const clearedFilters: SandboxFilters = {
      status: [],
      framework: [],
      region: [],
      visibility: [],
      user: "",
      dateRange: { from: null, to: null },
      search: "",
    }
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">{t("admin.filters")}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("admin.status")}</Label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={localFilters.status.includes(option.value)}
                    onCheckedChange={(checked) => handleCheckboxChange("status", option.value, checked as boolean)}
                  />
                  <Label htmlFor={`status-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Framework Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("admin.framework")}</Label>
            <div className="space-y-2">
              {frameworkOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`framework-${option.value}`}
                    checked={localFilters.framework.includes(option.value)}
                    onCheckedChange={(checked) => handleCheckboxChange("framework", option.value, checked as boolean)}
                  />
                  <Label htmlFor={`framework-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Region Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("admin.region")}</Label>
            <div className="space-y-2">
              {regionOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`region-${option.value}`}
                    checked={localFilters.region.includes(option.value)}
                    onCheckedChange={(checked) => handleCheckboxChange("region", option.value, checked as boolean)}
                  />
                  <Label htmlFor={`region-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Visibility Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("admin.visibility")}</Label>
            <div className="space-y-2">
              {visibilityOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`visibility-${option.value}`}
                    checked={localFilters.visibility.includes(option.value)}
                    onCheckedChange={(checked) => handleCheckboxChange("visibility", option.value, checked as boolean)}
                  />
                  <Label htmlFor={`visibility-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Filter */}
        <div className="space-y-3">
          <Label htmlFor="user-filter" className="text-sm font-medium">{t("admin.user")}</Label>
          <Input
            id="user-filter"
            placeholder={t("admin.filterByUser")}
            value={localFilters.user}
            onChange={(e) => setLocalFilters((prev) => ({ ...prev, user: e.target.value }))}
          />
        </div>

        {/* Date Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("admin.dateRange")}</Label>
          <DatePickerWithRange
            date={{
              from: localFilters.dateRange.from || undefined,
              to: localFilters.dateRange.to || undefined,
            }}
            onDateChange={(range) =>
              setLocalFilters((prev) => ({
                ...prev,
                dateRange: { from: range?.from || null, to: range?.to || null },
              }))
            }
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClearFilters}>
            {t("action.clearAll")}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("action.cancel")}
            </Button>
            <Button onClick={handleApplyFilters}>{t("action.applyFilters")}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

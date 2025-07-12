import React from 'react'
import { Search, Filter } from 'lucide-react'
import { Input } from './input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Card, CardContent } from './card'

interface SearchFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: Array<{
    key: string
    label: string
    value: string
    onValueChange: (value: string) => void
    options: Array<{ value: string; label: string }>
  }>
  className?: string
}

export function SearchFilters({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  className = ""
}: SearchFiltersProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          {filters.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              {filters.map((filter) => (
                <Select key={filter.key} value={filter.value} onValueChange={filter.onValueChange}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SortIndicatorProps {
  isSorted: boolean
  sortDirection?: "asc" | "desc"
  className?: string
}

export function SortIndicator({ isSorted, sortDirection, className }: SortIndicatorProps) {
  if (!isSorted) {
    return (
      <div className={cn(
        "flex items-center justify-center w-4 h-4 text-muted-foreground/40 transition-all duration-200 group-hover:text-muted-foreground/60 group-hover:scale-110",
        className
      )}>
        <div className="w-1 h-1 bg-current rounded-full" />
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-center justify-center w-4 h-4 text-primary transition-all duration-200 group-hover:scale-110",
      className
    )}>
      {sortDirection === "asc" ? (
        <ArrowUp className="w-3 h-3" />
      ) : (
        <ArrowDown className="w-3 h-3" />
      )}
    </div>
  )
} 
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter, TableCaption } from "./table"

interface ResizableTableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
  defaultColumnWidths?: Record<string, number>
  minColumnWidth?: number
  maxColumnWidth?: number
  onColumnResize?: (columnId: string, width: number) => void
}

interface ResizableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnId: string
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  onResize?: (width: number) => void
}

const ResizableTableContext = React.createContext<{
  columnWidths: Record<string, number>
  setColumnWidth: (columnId: string, width: number) => void
  minColumnWidth: number
  maxColumnWidth: number
} | null>(null)

const useResizableTable = () => {
  const context = React.useContext(ResizableTableContext)
  if (!context) {
    throw new Error("useResizableTable must be used within a ResizableTable")
  }
  return context
}

const ResizableTable = React.forwardRef<HTMLTableElement, ResizableTableProps>(
  ({ 
    children, 
    defaultColumnWidths = {}, 
    minColumnWidth = 100, 
    maxColumnWidth = 500,
    onColumnResize,
    className,
    ...props 
  }, ref) => {
    const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>(defaultColumnWidths)

    const setColumnWidth = React.useCallback((columnId: string, width: number) => {
      const clampedWidth = Math.max(minColumnWidth, Math.min(maxColumnWidth, width))
      setColumnWidths(prev => {
        const newWidths = { ...prev, [columnId]: clampedWidth }
        onColumnResize?.(columnId, clampedWidth)
        return newWidths
      })
    }, [minColumnWidth, maxColumnWidth, onColumnResize])

    const contextValue = React.useMemo(() => ({
      columnWidths,
      setColumnWidth,
      minColumnWidth,
      maxColumnWidth
    }), [columnWidths, setColumnWidth, minColumnWidth, maxColumnWidth])

    return (
      <ResizableTableContext.Provider value={contextValue}>
        <div className="relative w-full overflow-x-auto">
          <table
            ref={ref}
            className={cn("w-full caption-bottom text-sm", className)}
            style={{ tableLayout: 'fixed' }}
            {...props}
          >
            {children}
          </table>
        </div>
      </ResizableTableContext.Provider>
    )
  }
)
ResizableTable.displayName = "ResizableTable"

const ResizableTableHead = React.forwardRef<HTMLTableCellElement, ResizableTableHeadProps>(
  ({ 
    columnId, 
    children, 
    defaultWidth = 150,
    minWidth,
    maxWidth,
    onResize,
    className,
    style,
    ...props 
  }, ref) => {
    const { columnWidths, setColumnWidth, minColumnWidth, maxColumnWidth } = useResizableTable()
    const [isResizing, setIsResizing] = React.useState(false)
    const [startX, setStartX] = React.useState(0)
    const [startWidth, setStartWidth] = React.useState(0)
    const resizeRef = React.useRef<HTMLDivElement>(null)

    const currentWidth = columnWidths[columnId] ?? defaultWidth
    const effectiveMinWidth = minWidth ?? minColumnWidth
    const effectiveMaxWidth = maxWidth ?? maxColumnWidth

    React.useEffect(() => {
      if (!columnWidths[columnId]) {
        setColumnWidth(columnId, defaultWidth)
      }
    }, [columnId, defaultWidth, columnWidths, setColumnWidth])

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      setStartX(e.clientX)
      setStartWidth(currentWidth)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }, [currentWidth])

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
      if (!isResizing) return

      const deltaX = e.clientX - startX
      const newWidth = Math.max(effectiveMinWidth, Math.min(effectiveMaxWidth, startWidth + deltaX))
      
      setColumnWidth(columnId, newWidth)
      onResize?.(newWidth)
    }, [isResizing, startX, startWidth, effectiveMinWidth, effectiveMaxWidth, columnId, setColumnWidth, onResize])

    const handleMouseUp = React.useCallback(() => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }, [])

    React.useEffect(() => {
      if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isResizing, handleMouseMove, handleMouseUp])

    return (
      <th
        ref={ref}
        className={cn(
          "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 relative group",
          className
        )}
        style={{
          ...style,
          width: currentWidth,
          minWidth: currentWidth,
          maxWidth: currentWidth
        }}
        {...props}
      >
        {children}
        <div
          ref={resizeRef}
          className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-30 transition-all duration-200 flex items-center justify-center"
          onMouseDown={handleMouseDown}
          style={{ 
            transform: 'translateX(1px)',
            zIndex: 10
          }}
        >
          <div className="w-0.5 h-6 bg-gray-300 group-hover:bg-blue-500 transition-colors duration-200" />
        </div>
      </th>
    )
  }
)
ResizableTableHead.displayName = "ResizableTableHead"

const ResizableTableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, style, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
        style={{
          ...style,
          overflow: 'hidden'
        }}
        {...props}
      />
    )
  }
)
ResizableTableCell.displayName = "ResizableTableCell"

// Re-export only the resizable components
export {
  ResizableTable,
  ResizableTableHead,
  ResizableTableCell
} 
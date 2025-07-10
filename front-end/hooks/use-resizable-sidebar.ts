"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export function useResizableSidebar(initialWidth = 300, minWidth = 200, maxWidth = 600) {
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && !isCollapsed) {
        const newWidth = mouseMoveEvent.clientX
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setSidebarWidth(newWidth)
        }
      }
    },
    [isResizing, isCollapsed, minWidth, maxWidth],
  )

  useEffect(() => {
    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [resize, stopResizing])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed])

  return {
    sidebarWidth: isCollapsed ? 60 : sidebarWidth,
    isCollapsed,
    isResizing,
    sidebarRef,
    startResizing,
    toggleCollapse,
  }
}

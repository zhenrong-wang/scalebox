"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "../../dashboard"

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    if (!localStorage.getItem("auth-token")) {
      router.replace("/signin")
      return
    }

    // Check if account is suspended
    const userData = localStorage.getItem("user-data")
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        if (parsed.account_suspended) {
          router.replace("/account-suspended")
          return
        }
      } catch (error) {
        console.error("Failed to parse user data:", error)
      }
    }

    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return <Dashboard />
} 
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LandingPage } from "../components/landing-page"
import { UserService } from "../services/user-service"

export default function LandingPageRoute() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Landing page should always show, regardless of auth state
    // No auto-redirects - let users navigate manually
    setIsLoading(false)
  }, [router])

  const handleSignIn = () => {
    // Check if auto-signin is disabled
    const autoSigninDisabled = localStorage.getItem("auto-signin-disabled")
    
    if (autoSigninDisabled === "true") {
      // Auto-signin is disabled, go to signin page
      router.push("/signin")
      return
    }
    
    // Check if user is already authenticated
    if (localStorage.getItem("auth-token")) {
      // Check if account is suspended from cached data first
      const userData = localStorage.getItem("user-data")
      if (userData) {
        try {
          const parsed = JSON.parse(userData)
          if (parsed.account_suspended) {
            router.push("/account-suspended")
            return
          }
        } catch (error) {
          console.error("Failed to parse user data:", error)
        }
      }
      
      // If not suspended, go to dashboard
      router.push("/dashboard")
    } else {
      router.push("/signin")
    }
  }

  const handleSignUp = () => {
    // Check if user is already authenticated
    if (localStorage.getItem("auth-token")) {
      // Sign out and disable auto-signin for next time
      localStorage.removeItem("auth-token")
      localStorage.removeItem("user-data")
      localStorage.setItem("auto-signin-disabled", "true")
      // Refresh the page to update button states
      window.location.reload()
    } else {
      router.push("/signin")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <LandingPage
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
    />
  )
}

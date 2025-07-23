"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SignInPage } from "../../components/signin-page"
import { LandingPage } from "../../components/landing-page"
import { UserService } from "../../services/user-service"

export default function SignInRoute() {
  const [authState, setAuthState] = useState<"landing" | "signin" | "authenticated">("landing")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    if (localStorage.getItem("auth-token")) {
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
      
      // If not suspended, go to dashboard
      router.replace("/dashboard")
      return
    }
    
    // If not authenticated, show signin page
    setAuthState("signin")
  }, [router])

  const handleSignIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await UserService.signin(email, password)
      if (!result || !result.access_token) {
        return { success: false, error: "Invalid email or password" }
      }
      
      // Check if account is suspended
      if (result.account_suspended) {
        // Don't try to fetch user profile for suspended accounts
        // The UserService.signin already handles redirection
        return { success: true }
      }
      
      // Fetch user profile for active accounts
      const user = await UserService.getCurrentUser(true) // Enable auto-redirect for active signin
      if (user) {
        setCurrentUser(user)
        setAuthState("authenticated")
        // Enable auto-signin for next time
        localStorage.removeItem("auto-signin-disabled")
        router.replace("/dashboard")
        return { success: true }
      }
      
      return { success: false, error: "Failed to fetch user profile" }
    } catch (error) {
      return { success: false, error: "Invalid email or password" }
    }
  }

  const handleSignUp = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await UserService.signup({ name, email, password })
      if (result && !result.error && !result.detail) {
        setAuthState("signin")
        return { success: true }
      }
      return { success: false, error: result?.detail || result?.error || "Signup failed" }
    } catch (error) {
      return { success: false, error: "Signup failed" }
    }
  }

  const handleBackToLanding = () => {
    router.push("/")
  }

  const handleSwitchToSignUp = () => {
    setAuthState("landing")
  }

  const handleForgotPassword = () => {
    // TODO: Implement forgot password
    console.log("Forgot password clicked")
  }

  if (authState === "landing") {
    return (
      <LandingPage
        onSignIn={() => setAuthState("signin")}
        onSignUp={() => setAuthState("landing")}
      />
    )
  }

  if (authState === "signin") {
    return (
      <SignInPage
        onSignIn={handleSignIn}
        onBackToLanding={handleBackToLanding}
        onSwitchToSignUp={handleSwitchToSignUp}
        onForgotPassword={handleForgotPassword}
      />
    )
  }

  return null
} 
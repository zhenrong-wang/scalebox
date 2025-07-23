"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Mail, Phone, ExternalLink } from "lucide-react"
import { useLanguage } from "../../contexts/language-context"

export default function AccountSuspendedPage() {
  const [accountName, setAccountName] = useState<string>("")
  const { t } = useLanguage()

  useEffect(() => {
    // Handle navigation intelligently
    if (typeof window !== "undefined") {
      // Listen for popstate events (back/forward button clicks)
      const handlePopState = (event: PopStateEvent) => {
        // Check if we're trying to go back to a dashboard-like URL
        const currentPath = window.location.pathname
        if (currentPath === "/dashboard" || currentPath.startsWith("/#")) {
          // Redirect to landing page instead of broken dashboard
          window.location.href = "/"
        }
      }
      
      window.addEventListener('popstate', handlePopState)
      
      // Cleanup
      return () => {
        window.removeEventListener('popstate', handlePopState)
      }
    }
    
    // Get account name from localStorage if available
    const userData = localStorage.getItem("user-data")
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        if (parsed.account_name) {
          setAccountName(parsed.account_name)
        }
      } catch (error) {
        console.error("Failed to parse user data:", error)
      }
    }
  }, [])

  const handleContactSupport = () => {
    // Open email client with pre-filled support email
    const subject = encodeURIComponent("Account Suspension - Support Request")
    const body = encodeURIComponent(
      `Hello ScaleBox Support Team,

I am writing regarding my suspended account: ${accountName}

Please provide information about:
1. Why my account was suspended
2. What steps I need to take to restore access
3. Any outstanding issues that need to be resolved

Thank you for your assistance.

Best regards,
[Your Name]`
    )
    window.open(`mailto:support@scalebox.com?subject=${subject}&body=${body}`)
  }

  const handleSignOut = () => {
    // Clear authentication data and disable auto-signin
    localStorage.removeItem("auth-token")
    localStorage.removeItem("user-data")
    localStorage.setItem("auto-signin-disabled", "true")
    // Redirect to landing page and replace history to prevent back navigation
    window.location.replace("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950 dark:to-orange-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-red-200 dark:border-red-800">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-800 dark:text-red-200">
            Account Suspended
          </CardTitle>
          <CardDescription className="text-lg text-red-600 dark:text-red-300">
            {accountName && `Account: ${accountName}`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Your ScaleBox account has been suspended by our administration team. 
              This action was taken due to policy violations, payment issues, or other 
              administrative reasons.
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>Important:</strong> While your account is suspended, you cannot access 
                any ScaleBox services, including sandboxes, projects, or API endpoints.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              To restore your account access:
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">1</span>
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Contact ScaleBox Support</strong> to understand why your account was suspended
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">2</span>
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Resolve any outstanding issues</strong> that led to the suspension
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">3</span>
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Follow support team guidance</strong> to restore your account
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Contact Information:
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Button 
                onClick={handleContactSupport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Support
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => window.open("https://scalebox.dev/support", "_blank")}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Support Portal
              </Button>
            </div>
            
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>Support Email: support@scalebox.com</p>
              <p>Response Time: Within 24 hours</p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
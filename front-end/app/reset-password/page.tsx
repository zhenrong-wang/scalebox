"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ResetPasswordConfirm } from "../../components/reset-password-confirm"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    }
  }, [searchParams])

  const handleBackToSignIn = () => {
    // Redirect to the main page
    window.location.href = '/'
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg mb-4">Invalid reset link</p>
          <p className="text-muted-foreground mb-6">The reset link is missing the required token parameter.</p>
          <button 
            onClick={handleBackToSignIn}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return <ResetPasswordConfirm token={token} onBackToSignIn={handleBackToSignIn} />
} 
"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2, Clock, Mail } from "lucide-react"

export default function ConfirmEmailChangePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading')
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState<any>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid confirmation link. Token is missing.')
      return
    }

    const confirmEmailChange = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/user-management/account/confirm-email-change`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token })
        })

        const data = await response.json()

        if (response.ok) {
          if (data.status === 'completed') {
            setStatus('success')
            setMessage(data.message || 'Email change completed successfully!')
            setDetails(data)
          } else if (data.status === 'pending') {
            setStatus('pending')
            setMessage(data.message || 'Email confirmed. Waiting for second confirmation.')
            setDetails(data)
          } else {
            setStatus('success')
            setMessage(data.message || 'Email change confirmed successfully!')
            setDetails(data)
          }
        } else {
          setStatus('error')
          setMessage(data.detail || 'Failed to confirm email change.')
        }
      } catch (error) {
        setStatus('error')
        setMessage('An error occurred while confirming the email change.')
      }
    }

    confirmEmailChange()
  }, [token])

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  const handleGoToSignIn = () => {
    router.push('/')
  }

  const formatExpiryTime = (expiresAt: string) => {
    if (!expiresAt) return ''
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffMs = expiry.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins <= 0) return 'Expired'
    if (diffMins < 60) return `${diffMins} minutes`
    const diffHours = Math.floor(diffMins / 60)
    return `${diffHours} hours ${diffMins % 60} minutes`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold">
            Email Change Confirmation
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Confirming your account email change...'}
            {status === 'success' && 'Email change confirmation'}
            {status === 'pending' && 'Waiting for second confirmation'}
            {status === 'error' && 'Confirmation error'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Confirming email change...</span>
            </div>
          )}

          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'pending' && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Show details for pending status */}
          {status === 'pending' && details && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Confirmation Status</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-blue-700">Confirmed:</span>
                  <span className="ml-2 text-blue-800 font-mono">{details.confirmed_email}</span>
                </div>
                <div>
                  <span className="text-blue-700">Waiting for:</span>
                  <span className="ml-2 text-blue-800 font-mono">{details.pending_email}</span>
                </div>
                {details.expires_at && (
                  <div>
                    <span className="text-blue-700">Expires in:</span>
                    <span className="ml-2 text-blue-800">{formatExpiryTime(details.expires_at)}</span>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-blue-600">
                Please check your email at {details.pending_email} and click the confirmation link to complete the change.
              </div>
            </div>
          )}

          {/* Show details for completed status */}
          {status === 'success' && details && details.current_email && details.new_email && (
            <div className="space-y-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Email Change Details</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-green-700">From:</span>
                  <span className="ml-2 text-green-800 font-mono">{details.current_email}</span>
                </div>
                <div>
                  <span className="text-green-700">To:</span>
                  <span className="ml-2 text-green-800 font-mono">{details.new_email}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleGoToSignIn} 
              className="w-full"
              variant={status === 'success' ? 'default' : 'outline'}
            >
              Go to Sign In
            </Button>
            {status === 'success' && (
              <Button 
                onClick={handleGoToDashboard} 
                variant="outline" 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
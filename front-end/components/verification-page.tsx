"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowLeft, Mail, RefreshCw, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "../contexts/language-context"
import { LanguageToggle } from "./language-toggle"
import { UserService } from "../services/user-service"

interface VerificationPageProps {
  email: string
  onVerify: (code: string) => Promise<{ success: boolean; error?: string }>
  onResend: () => Promise<{ success: boolean; error?: string }>
  onBackToSignUp: () => void
}

export function VerificationPage({ email, onVerify, onResend, onBackToSignUp }: VerificationPageProps) {
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const { t } = useLanguage()

  const MAX_ATTEMPTS = 3

  useEffect(() => {
    // Start 60-second countdown for resend
    setResendCountdown(60)
    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code")
      return
    }

    if (attempts >= MAX_ATTEMPTS) {
      setError("Maximum verification attempts reached. Please try signing up again.")
      return
    }

    setIsLoading(true)

    try {
      const result = await onVerify(verificationCode)
      if (result.success) {
        setSuccess("Email verified successfully! Signing you in...")
        // Success will be handled by the parent component
      } else {
        setAttempts(prev => prev + 1)
        setError(result.error || "Verification failed")
        setVerificationCode("") // Clear the input for retry
      }
    } catch (err) {
      setAttempts(prev => prev + 1)
      setError("Verification failed. Please try again.")
      setVerificationCode("")
      
      // If max attempts reached, cleanup the failed signup
      if (attempts + 1 >= MAX_ATTEMPTS) {
        try {
          await UserService.cleanupFailedSignup(email)
        } catch (error) {
          console.error("Failed to cleanup signup:", error)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!canResend) return

    setIsResending(true)
    setError("")
    setSuccess("")

    try {
      const result = await onResend()
      if (result.success) {
        setSuccess("Verification code resent! Please check your email.")
        setCanResend(false)
        setResendCountdown(60)
        // Start countdown again
        const timer = setInterval(() => {
          setResendCountdown((prev) => {
            if (prev <= 1) {
              setCanResend(true)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        setTimeout(() => clearInterval(timer), 60000)
      } else {
        setError(result.error || "Failed to resend verification code")
      }
    } catch (err) {
      setError("Failed to resend verification code")
    } finally {
      setIsResending(false)
    }
  }

  const handleBackToSignUp = async () => {
    if (attempts >= MAX_ATTEMPTS) {
      // If max attempts reached, cleanup the failed signup
      try {
        await UserService.cleanupFailedSignup(email)
      } catch (error) {
        console.error("Failed to cleanup signup:", error)
      }
    }
    // Go back to signup to start fresh
    onBackToSignUp()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button variant="ghost" onClick={handleBackToSignUp} className="absolute top-4 left-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign Up
          </Button>

          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold">Email Verification</span>
          </div>
        </div>

        {/* Verification Form */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a 6-digit verification code to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <X className="h-4 w-4" />
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <Check className="h-4 w-4" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading || attempts >= MAX_ATTEMPTS}
                  className="text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                  required
                />
                <div className="text-xs text-muted-foreground text-center">
                  {attempts > 0 && (
                    <span className="text-orange-600">
                      Attempts: {attempts}/{MAX_ATTEMPTS}
                    </span>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || attempts >= MAX_ATTEMPTS}>
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={!canResend || isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Resending...
                  </>
                ) : canResend ? (
                  "Resend Code"
                ) : (
                  `Resend in ${resendCountdown}s`
                )}
              </Button>
            </div>

            {attempts >= MAX_ATTEMPTS && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 text-center">
                  Maximum verification attempts reached. Please go back and try signing up again.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
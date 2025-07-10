"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowLeft, Lock, Check, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "../contexts/language-context"
import { LanguageToggle } from "./language-toggle"
import { UserService } from "../services/user-service"

interface ResetPasswordConfirmProps {
  token: string
  onBackToSignIn: () => void
}

export function ResetPasswordConfirm({ token, onBackToSignIn }: ResetPasswordConfirmProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const { t } = useLanguage()

  useEffect(() => {
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const result = await UserService.validateResetToken(token)
      if (result && !result.error && !result.detail && result.valid) {
        setUserEmail(result.email)
        setIsValidating(false)
      } else {
        setError("Invalid or expired reset link. Please request a new one.")
        setIsValidating(false)
      }
    } catch (err) {
      setError("Invalid or expired reset link. Please request a new one.")
      setIsValidating(false)
    }
  }

  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }
  }
  const passwordRequirements = validatePassword(newPassword)
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!isPasswordValid) {
      setError("Password does not meet requirements.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const result = await UserService.resetPasswordConfirm(token, newPassword)
      if (result && !result.error && !result.detail) {
        setSuccess("Password has been reset successfully! You can now sign in with your new password.")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setError(result?.detail || result?.error || "Failed to reset password")
      }
    } catch (err) {
      setError("Failed to reset password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>Validating reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button variant="ghost" onClick={onBackToSignIn} className="absolute top-4 left-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>

          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold">Set New Password</span>
          </div>
        </div>

        {/* Reset Password Form */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Create New Password</CardTitle>
            <CardDescription>
              {userEmail && `Enter a new password for ${userEmail}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-destructive/50 bg-destructive/10">
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
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-xs space-y-1 mt-2">
                  <div className="text-muted-foreground mb-1">Password must meet all requirements:</div>
                  <div className={`flex items-center gap-1 ${passwordRequirements.length ? "text-green-600" : "text-destructive"}`}>
                    <Check className={`h-3 w-3 ${passwordRequirements.length ? "opacity-100" : "opacity-30"}`} />
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1 ${passwordRequirements.uppercase ? "text-green-600" : "text-destructive"}`}>
                    <Check className={`h-3 w-3 ${passwordRequirements.uppercase ? "opacity-100" : "opacity-30"}`} />
                    At least one uppercase letter
                  </div>
                  <div className={`flex items-center gap-1 ${passwordRequirements.lowercase ? "text-green-600" : "text-destructive"}`}>
                    <Check className={`h-3 w-3 ${passwordRequirements.lowercase ? "opacity-100" : "opacity-30"}`} />
                    At least one lowercase letter
                  </div>
                  <div className={`flex items-center gap-1 ${passwordRequirements.number ? "text-green-600" : "text-destructive"}`}>
                    <Check className={`h-3 w-3 ${passwordRequirements.number ? "opacity-100" : "opacity-30"}`} />
                    At least one number
                  </div>
                  <div className={`flex items-center gap-1 ${passwordRequirements.special ? "text-green-600" : "text-destructive"}`}>
                    <Check className={`h-3 w-3 ${passwordRequirements.special ? "opacity-100" : "opacity-30"}`} />
                    At least one special character
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Button variant="link" onClick={onBackToSignIn} className="p-0 h-auto">
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
"use client"

import type React from "react"
import { useState } from "react"
import { ArrowLeft, Mail, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "../contexts/language-context"
import { LanguageToggle } from "./language-toggle"
import { UserService } from "../services/user-service"

interface ResetPasswordRequestProps {
  onBackToSignIn: () => void
}

export function ResetPasswordRequest({ onBackToSignIn }: ResetPasswordRequestProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      const result = await UserService.resetPassword(email)
      if (result && result.error === "email_not_found") {
        setError(t("resetPassword.emailNotFound"))
      } else if (result && !result.error && !result.detail) {
        setSuccess(t("resetPassword.success"))
        setEmail("") // Clear the email field
      } else {
        setError(result?.detail || result?.error || t("resetPassword.error"))
      }
    } catch (err) {
      setError(t("resetPassword.error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button variant="ghost" onClick={onBackToSignIn} className="absolute top-4 left-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("action.back")} {t("action.signIn")}
          </Button>

          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold">{t("resetPassword.title")}</span>
          </div>
        </div>

        {/* Reset Password Form */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("resetPassword.title")}</CardTitle>
            <CardDescription>
              {t("resetPassword.description")}
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
                <Label htmlFor="email">{t("resetPassword.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("resetPassword.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    {t("resetPassword.loading")}
                  </>
                ) : (
                  t("resetPassword.button")
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("resetPassword.rememberPassword")}{" "}
                <Button variant="link" onClick={onBackToSignIn} className="p-0 h-auto">
                  {t("resetPassword.signInHere")}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
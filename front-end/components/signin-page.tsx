"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Eye, EyeOff, ArrowLeft, Box } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RecaptchaMock } from "@/components/ui/recaptcha-mock"
import { useLanguage } from "../contexts/language-context"
import { LanguageToggle } from "./language-toggle"

interface SignInPageProps {
  onSignIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  onBackToLanding: () => void
  onSwitchToSignUp: () => void
  onForgotPassword: () => void
}

export function SignInPage({ onSignIn, onBackToLanding, onSwitchToSignUp, onForgotPassword }: SignInPageProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [recaptchaVerified, setRecaptchaVerified] = useState(false)
  const [captchaValue, setCaptchaValue] = useState("")
  const [captchaError, setCaptchaError] = useState("")
  const [shouldRegenerateCaptcha, setShouldRegenerateCaptcha] = useState(false)
  const captchaRef = useRef<{ validate: () => void }>(null)
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setShouldRegenerateCaptcha(false)

    if (!formData.email || !formData.password) {
      setError(t("signin.error.fillAllFields"))
      return
    }

    // Validate captcha if not already verified
    if (!recaptchaVerified) {
      // Trigger captcha validation - it will handle empty input internally
      captchaRef.current?.validate()
      return
    }

    // Proceed with sign in
    await submitSignIn()
  }

  const submitSignIn = async () => {
    setIsLoading(true)

    try {
      const result = await onSignIn(formData.email, formData.password)
      if (!result.success) {
        setError(result.error || t("signin.error.signInFailed"))
        setShouldRegenerateCaptcha(true)
      }
    } catch (err) {
      setError(t("signin.error.unexpectedError"))
      setShouldRegenerateCaptcha(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button variant="ghost" onClick={onBackToLanding} className="absolute top-4 left-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("action.back") || "Back"}
          </Button>

          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Box className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold">ScaleBox</span>
          </div>
        </div>

        {/* Sign In Form */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("signin.title")}</CardTitle>
            <CardDescription>{t("signin.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("signin.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("signin.email")}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("signin.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("signin.password")}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm"
                  onClick={onForgotPassword}
                >
                  {t("signin.forgot")}
                </Button>
              </div>

              {/* reCAPTCHA */}
              <RecaptchaMock 
                ref={captchaRef}
                onVerify={() => setRecaptchaVerified(true)} 
                disabled={isLoading || recaptchaVerified}
                value={captchaValue}
                onChange={setCaptchaValue}
                onError={setCaptchaError}
                clearError={() => setCaptchaError("")}
                regenerateOnError={shouldRegenerateCaptcha}
                onRegenerate={() => setShouldRegenerateCaptcha(false)}
                onValidate={(isValid) => {
                  if (isValid) {
                    // Captcha is valid, proceed with sign in
                    submitSignIn()
                  }
                }}
              />
              {captchaError && (
                <div className="text-xs text-destructive">
                  {captchaError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    {t("signin.loading")}
                  </>
                ) : (
                  t("signin.button")
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("signin.noAccount")}{" "}
                <Button variant="link" className="px-0 text-sm" onClick={onSwitchToSignUp}>
                  {t("signin.signUp")}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

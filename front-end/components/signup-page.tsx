"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Eye, EyeOff, ArrowLeft, Box, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { RecaptchaMock } from "@/components/ui/recaptcha-mock"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import type { CheckedState } from "@/components/ui/checkbox"
import { useLanguage } from "../contexts/language-context"
import { LanguageToggle } from "./language-toggle"
import { UserService } from "../services/user-service";

interface SignUpPageProps {
  onSignUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  onBackToLanding: () => void
  onSwitchToSignIn: () => void
}

export function SignUpPage({ onSignUp, onBackToLanding, onSwitchToSignIn }: SignUpPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [recaptchaVerified, setRecaptchaVerified] = useState(false)
  const [captchaValue, setCaptchaValue] = useState("")
  const [captchaError, setCaptchaError] = useState("")
  const [shouldRegenerateCaptcha, setShouldRegenerateCaptcha] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [inputCode, setInputCode] = useState("")
  const [verificationError, setVerificationError] = useState("")
  const captchaRef = useRef<{ validate: () => void }>(null)

  const { t } = useLanguage()

  const validateName = (name: string) => {
    if (!name.trim()) return t("signup.fullName.required")
    if (name.trim().length < 8) return t("signup.fullName.minLength")
    if (name.trim().length > 32) return t("signup.fullName.maxLength")
    return ""
  }

  const validateEmail = (email: string) => {
    if (!email.trim()) return t("signup.email.required")
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return t("signup.email.invalid")
    return ""
  }

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }
    return requirements
  }

  const validatePasswordMatch = (password: string, confirmPassword: string) => {
    if (!confirmPassword) return t("signup.confirmPassword.required")
    if (password !== confirmPassword) return t("signup.confirmPassword.match")
    return ""
  }

  const passwordRequirements = validatePassword(formData.password)
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setShouldRegenerateCaptcha(false)

    // Validate all fields
    const nameError = validateName(formData.name)
    const emailError = validateEmail(formData.email)
    const passwordMatchError = validatePasswordMatch(formData.password, formData.confirmPassword)

    setFieldErrors({
      name: nameError,
      email: emailError,
      password: !isPasswordValid ? t("signup.password.requirements") : "",
      confirmPassword: passwordMatchError,
    })

    // Check if any validation failed
    if (nameError || emailError || !isPasswordValid || passwordMatchError || !acceptTerms) {
      if (!acceptTerms) setError(t("signup.terms.required"))
      return
    }
    
    // Validate captcha if not already verified
    if (!recaptchaVerified) {
      if (captchaValue.trim() === "") {
        setError(t("signup.recaptcha.required"))
        return
      }
      // Trigger captcha validation
      captchaRef.current?.validate()
      return
    }
    
    // Proceed with form submission
    await submitForm()
  }

  const submitForm = async () => {
    setIsLoading(true)

    try {
      const result = await onSignUp(formData.email, formData.password, formData.name);
      if (result.success) {
        setShowVerification(true);
      } else {
        setError(result.error || t("signup.unexpectedError"));
        setShouldRegenerateCaptcha(true);
      }
    } catch (err) {
      setError(t("signup.unexpectedError"));
      setShouldRegenerateCaptcha(true);
    } finally {
      setIsLoading(false);
    }
  }

  const handleVerifyCode = async () => {
    setIsLoading(true);
    setVerificationError("");
    try {
      const verifyResult = await UserService.verifyEmail(inputCode, formData.email);
      if (verifyResult && verifyResult.msg && verifyResult.msg.includes("successfully")) {
        setShowVerification(false);
        // Optionally, auto sign-in or show a success message
        onSwitchToSignIn();
      } else {
        setVerificationError(t("signup.verification.incorrectCode"));
      }
    } catch (err) {
      setVerificationError(t("signup.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

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

        {/* Sign Up Form */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("signup.title")}</CardTitle>
            <CardDescription>{t("signup.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              {/* Full Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">{t("signup.fullName")}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t("signup.fullName")}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    const nameError = validateName(e.target.value)
                    setFieldErrors((prev) => ({ ...prev, name: nameError }))
                  }}
                  className={fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                  disabled={isLoading}
                  required
                />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">8-32 {t("signup.fullName")}</span>
                  <span className={`${formData.name.length > 32 ? "text-destructive" : "text-muted-foreground"}`}>
                    {formData.name.length}/32
                  </span>
                </div>
                {fieldErrors.name && <div className="text-xs text-destructive font-medium">{fieldErrors.name}</div>}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">{t("signup.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("signup.email") + " (x@y.z)"}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    const emailError = validateEmail(e.target.value)
                    setFieldErrors((prev) => ({ ...prev, email: emailError }))
                  }}
                  className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                  disabled={isLoading}
                  required
                />
                {fieldErrors.email && <div className="text-xs text-destructive font-medium">{fieldErrors.email}</div>}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">{t("signup.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("signup.password")}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value })
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: "" }))
                      }
                    }}
                    className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
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

                {/* Password Requirements */}
                {formData.password && (
                  <div className="text-xs space-y-1 mt-2">
                    <div className="text-muted-foreground mb-1">{t("signup.password.requirements")}</div>
                    <div
                      className={`flex items-center gap-1 ${passwordRequirements.length ? "text-green-600" : "text-destructive"}`}
                    >
                      <Check className={`h-3 w-3 ${passwordRequirements.length ? "opacity-100" : "opacity-30"}`} />
                      {t("signup.password.length")}
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordRequirements.uppercase ? "text-green-600" : "text-destructive"}`}
                    >
                      <Check className={`h-3 w-3 ${passwordRequirements.uppercase ? "opacity-100" : "opacity-30"}`} />
                      {t("signup.password.uppercase")}
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordRequirements.lowercase ? "text-green-600" : "text-destructive"}`}
                    >
                      <Check className={`h-3 w-3 ${passwordRequirements.lowercase ? "opacity-100" : "opacity-30"}`} />
                      {t("signup.password.lowercase")}
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordRequirements.number ? "text-green-600" : "text-destructive"}`}
                    >
                      <Check className={`h-3 w-3 ${passwordRequirements.number ? "opacity-100" : "opacity-30"}`} />
                      {t("signup.password.number")}
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordRequirements.special ? "text-green-600" : "text-destructive"}`}
                    >
                      <Check className={`h-3 w-3 ${passwordRequirements.special ? "opacity-100" : "opacity-30"}`} />
                      {t("signup.password.special")}
                    </div>
                  </div>
                )}
                {fieldErrors.password && (
                  <div className="text-xs text-destructive font-medium">{fieldErrors.password}</div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("signup.confirmPassword")}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("signup.confirmPassword")}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value })
                      const matchError = validatePasswordMatch(formData.password, e.target.value)
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: matchError }))
                    }}
                    className={fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {fieldErrors.confirmPassword && (
                  <div className="text-xs text-destructive font-medium">{fieldErrors.confirmPassword}</div>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(checked: any) => setAcceptTerms(checked === true)} disabled={isLoading} />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the{" "}
                  <Button variant="link" className="px-0 text-sm h-auto p-0" asChild>
                    <a href="/terms" target="_blank" rel="noopener noreferrer">
                      {t("action.terms")}
                    </a>
                  </Button>{" "}
                  and{" "}
                  <Button variant="link" className="px-0 text-sm h-auto p-0" asChild>
                    <a href="/privacy" target="_blank" rel="noopener noreferrer">
                      {t("action.privacy")}
                    </a>
                  </Button>
                </Label>
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
                    // Captcha is valid, proceed with form submission
                    submitForm()
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
                    {t("signup.loading")}
                  </>
                ) : (
                  t("signup.button")
                )}
              </Button>
            </form>

            {/* Email Verification Dialog */}
            <Dialog open={showVerification}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("signup.verification.title")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <p>{t("signup.verification.desc")}</p>
                  <Input
                    type="text"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                    maxLength={6}
                    autoFocus
                  />
                  {verificationError && <div className="text-xs text-destructive font-medium">{t("signup.verification.error")}</div>}
                  <Button onClick={handleVerifyCode} className="w-full" disabled={isLoading}>{t("signup.verification.button")}</Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("signup.haveAccount")}{" "}
                <Button variant="link" className="px-0 text-sm" onClick={onSwitchToSignIn}>
                  {t("signup.signIn")}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

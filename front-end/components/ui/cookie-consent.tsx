"use client"

import { useState, useEffect } from "react"
import { X, Cookie, Shield, Settings } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { useLanguage } from "../../contexts/language-context"

interface CookieConsentProps {
  onAccept?: () => void
  onReject?: () => void
  onSettings?: () => void
}

export function CookieConsent({ onAccept, onReject, onSettings }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem("cookie-consent")
    if (!cookieConsent) {
      // Show after a short delay to not be intrusive
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted")
    setIsVisible(false)
    onAccept?.()
  }

  const handleReject = () => {
    localStorage.setItem("cookie-consent", "rejected")
    setIsVisible(false)
    onReject?.()
  }

  const handleSettings = () => {
    onSettings?.()
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Cookie Icon */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 text-primary">
                <Cookie className="h-5 w-5" />
                <Shield className="h-4 w-4" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">
                {t("cookie.title") || "We use cookies"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("cookie.description") || 
                  "We use cookies to enhance your experience, analyze site traffic, and personalize content. By continuing to use our site, you consent to our use of cookies."}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSettings}
                className="gap-1"
              >
                <Settings className="h-3 w-3" />
                {t("cookie.settings") || "Settings"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
              >
                {t("cookie.reject") || "Reject"}
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
              >
                {t("cookie.accept") || "Accept All"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReject}
                className="sm:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
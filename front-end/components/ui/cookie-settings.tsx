"use client"

import { useState, useEffect } from "react"
import { X, Cookie, Shield, Settings } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog"
import { useLanguage } from "../../contexts/language-context"

interface CookieSettingsProps {
  isOpen: boolean
  onClose: () => void
  onAccept?: () => void
  onReject?: () => void
}

export function CookieSettings({ isOpen, onClose, onAccept, onReject }: CookieSettingsProps) {
  const { t } = useLanguage()
  const [cookieConsent, setCookieConsent] = useState<string | null>(null)

  useEffect(() => {
    // Only access localStorage on the client side
    if (typeof window !== "undefined") {
      setCookieConsent(localStorage.getItem("cookie-consent"))
    }
  }, [isOpen])

  const handleAccept = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cookie-consent", "accepted")
      setCookieConsent("accepted")
    }
    onAccept?.()
    onClose()
  }

  const handleReject = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cookie-consent", "rejected")
      setCookieConsent("rejected")
    }
    onReject?.()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Cookie className="h-5 w-5" />
              <Shield className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xl font-bold">
              {t("cookie.settingsTitle") || "Cookie Settings"}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-base mb-2">
              {t("cookie.title") || "We use cookies"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("cookie.description") || 
                "We use cookies to enhance your experience, analyze site traffic, and personalize content. By continuing to use our site, you consent to our use of cookies."}
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">{t("cookie.currentPreference") || "Your current preference:"}</h4>
            <p className="text-sm text-muted-foreground">
              {cookieConsent === "accepted" 
                ? t("cookie.accepted") || "✅ Cookies are accepted"
                : cookieConsent === "rejected"
                ? t("cookie.rejected") || "❌ Cookies are rejected"
                : t("cookie.noPreference") || "⏳ No preference set yet"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleReject}
              className="flex-1"
            >
              {t("cookie.reject") || "Reject All"}
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1"
            >
              {t("cookie.accept") || "Accept All"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            {t("cookie.changeSettings") || "You can change these settings at any time by clicking \"Cookie Settings\" in the footer."}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
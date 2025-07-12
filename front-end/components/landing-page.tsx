"use client"

import { useState } from "react"
import { Box, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "../contexts/language-context"
import { LanguageToggle } from "./language-toggle"
import { CookieConsent } from "./ui/cookie-consent"
import { CookieSettings } from "./ui/cookie-settings"
import { PrivacyModal } from "./ui/privacy-modal"
import { TermsModal } from "./ui/terms-modal"

interface LandingPageProps {
  onSignIn: () => void
  onSignUp: () => void
}

export function LandingPage({ onSignIn, onSignUp }: LandingPageProps) {
  const { t } = useLanguage()
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)
  const [isCookieSettingsOpen, setIsCookieSettingsOpen] = useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const features = [
    t("landing.feature.instantSandboxes"),
    t("landing.feature.apiManagement"),
    t("landing.feature.collaboration"),
    t("landing.feature.security"),
    t("landing.feature.support"),
    t("landing.feature.uptime"),
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 dark:bg-gray-900/80 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Box className="h-4 w-4" />
              </div>
              <span className="text-xl font-bold">ScaleBox</span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <Button variant="outline" onClick={onSignIn}>
                {t("action.signIn")}
              </Button>
              <Button onClick={onSignUp}>{t("action.signUp")}</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with top padding to account for fixed header */}
      <main className="pt-24">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold tracking-tight mb-6">
              {t("landing.title")}
              <span className="text-primary block">{t("landing.subtitle")}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("landing.description")}
            </p>

            <div className="flex gap-4 justify-center mb-16">
              <Button size="lg" onClick={onSignUp} className="gap-2">
                {t("landing.getStarted")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="https://docs.scalebox.dev" target="_blank" rel="noopener noreferrer">
                  {t("landing.viewDocs")}
                </a>
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              <Card>
                <CardHeader>
                  <CardTitle>{t("landing.card.instantSandboxes")}</CardTitle>
                  <CardDescription>
                    {t("landing.card.instantSandboxes.desc")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("landing.card.apiManagement")}</CardTitle>
                  <CardDescription>
                    {t("landing.card.apiManagement.desc")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("landing.card.budgetControl")}</CardTitle>
                  <CardDescription>{t("landing.card.budgetControl.desc")}</CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Feature List */}
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>{t("landing.card.scale")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2024 ScaleBox. {t("footer.allRightsReserved")}</p>
            <div className="flex justify-center gap-6 mt-4">
              <button 
                onClick={() => setIsPrivacyModalOpen(true)}
                className="hover:text-foreground cursor-pointer"
              >
                {t("action.privacy")}
              </button>
              <button 
                onClick={() => setIsCookieSettingsOpen(true)}
                className="hover:text-foreground cursor-pointer"
              >
                {t("cookie.settings")}
              </button>
                          <button 
              onClick={() => setIsTermsModalOpen(true)}
              className="hover:text-foreground cursor-pointer"
            >
              {t("action.terms")}
            </button>
              <a
                href="https://docs.scalebox.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {t("landing.viewDocs")}
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* Cookie Consent */}
      <CookieConsent 
        onAccept={() => console.log("Cookies accepted")}
        onReject={() => console.log("Cookies rejected")}
        onSettings={() => console.log("Cookie settings opened")}
      />

      {/* Privacy Modal */}
      <PrivacyModal 
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Cookie Settings Modal */}
      <CookieSettings 
        isOpen={isCookieSettingsOpen}
        onClose={() => setIsCookieSettingsOpen(false)}
        onAccept={() => console.log("Cookies accepted via settings")}
        onReject={() => console.log("Cookies rejected via settings")}
      />

      {/* Terms of Service Modal */}
      <TermsModal 
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
    </div>
  )
}

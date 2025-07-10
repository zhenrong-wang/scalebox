"use client"

import { Languages } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useLanguage } from "../contexts/language-context"
import type { Language } from "../lib/i18n"

export function LanguageToggle() {
  const { language, setLanguage, t, isHydrated } = useLanguage()

  const options: { code: Language; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
    { code: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
  ]

  // Don't render until hydration is complete to prevent SSR/client mismatch
  if (!isHydrated) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Languages className="size-4" />
        <span className="sr-only">Select language</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Languages className="size-4" />
          <span className="sr-only">{t("language.select")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((opt) => (
          <DropdownMenuItem key={opt.code} onClick={() => setLanguage(opt.code)} className="flex gap-2 items-center">
            <span className="text-lg">{opt.flag}</span>
            <span>{opt.label}</span>
            {language === opt.code && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

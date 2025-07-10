"use client"

import { Languages } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useLanguage, type Language } from "../contexts/language-context"

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()

  const options: { code: Language; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
    { code: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
  ]

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

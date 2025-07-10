"use client"
import { createContext, useContext, useState, type ReactNode } from "react"
import { translations, type Language } from "@/lib/i18n"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({
  children,
  storageKey = "dashboard-language",
  defaultLanguage = "en",
}: {
  children: ReactNode
  storageKey?: string
  defaultLanguage?: Language
}) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey) as Language | null
      if (stored && stored in translations) return stored
      const nav = navigator.language.toLowerCase()
      if (nav.startsWith("zh-cn") || nav === "zh") return "zh-CN"
      if (nav.startsWith("zh-tw") || nav.startsWith("zh-hk")) return "zh-TW"
    }
    return defaultLanguage
  })

  const changeLang = (lang: Language) => {
    setLanguage(lang)
    if (typeof window !== "undefined") localStorage.setItem(storageKey, lang)
  }

  const value: LanguageContextType = {
    language,
    setLanguage: changeLang,
    t: (k) => translations[language][k] ?? translations.en[k] ?? k,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider")
  return ctx
}

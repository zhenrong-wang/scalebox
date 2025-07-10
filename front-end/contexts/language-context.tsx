"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { translations, type Language, tReplace } from "@/lib/i18n"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, vars?: Record<string, string>) => string
  isHydrated: boolean
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
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [isHydrated, setIsHydrated] = useState(false)

  // Initialize language after hydration to prevent SSR/client mismatch
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Language | null
    if (stored && stored in translations) {
      setLanguage(stored)
    } else {
      const nav = navigator.language.toLowerCase()
      if (nav.startsWith("zh-cn") || nav === "zh") {
        setLanguage("zh-CN")
      } else if (nav.startsWith("zh-tw") || nav.startsWith("zh-hk")) {
        setLanguage("zh-TW")
      }
      // If none of the above, keep the default language
    }
    setIsHydrated(true)
  }, [storageKey])

  const changeLang = (lang: Language) => {
    setLanguage(lang)
    if (typeof window !== "undefined") localStorage.setItem(storageKey, lang)
  }

  const value: LanguageContextType = {
    language,
    setLanguage: changeLang,
    t: (k, vars) => {
      const str = translations[language][k] ?? translations.en[k] ?? k;
      return vars ? tReplace(str, vars) : str;
    },
    isHydrated,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider")
  return ctx
}

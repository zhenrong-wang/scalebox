"use client"
import { LanguageProvider } from "../contexts/language-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
} 
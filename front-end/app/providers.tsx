"use client"
import { LanguageProvider } from "../contexts/language-context"
import { TooltipProvider } from "../components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </LanguageProvider>
  )
} 
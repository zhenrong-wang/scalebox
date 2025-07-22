"use client"
import { LanguageProvider } from "../contexts/language-context"
import { ThemeProvider } from "../contexts/theme-context"
import { TooltipProvider } from "../components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </LanguageProvider>
  )
} 
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { useLanguage } from "../../contexts/language-context"
import { AudioCaptcha } from "./audio-captcha"

interface RecaptchaMockProps {
  onVerify: () => void
  disabled?: boolean
  value: string
  onChange: (value: string) => void
  onError: (error: string) => void
  clearError: () => void
  regenerateOnError?: boolean
}

export function RecaptchaMock({ onVerify, disabled, value, onChange, onError, clearError, regenerateOnError = false }: RecaptchaMockProps) {
  const { t } = useLanguage()
  const [captchaText, setCaptchaText] = useState("")
  const [isVerified, setIsVerified] = useState(false)

  // Generate random captcha text
  const generateCaptcha = useCallback(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaText(result)
    setIsVerified(false)
    clearError()
  }, [clearError])

  // Generate initial captcha on mount
  useEffect(() => {
    generateCaptcha()
  }, [generateCaptcha])

  // Validate user input
  const validateInput = () => {
    if (value.toUpperCase() === captchaText) {
      setIsVerified(true)
      clearError()
      onVerify()
    } else {
      onError(t("recaptcha.error") || "Incorrect captcha")
      setIsVerified(false)
      // Clear input
      onChange("")
      // Only regenerate captcha if explicitly requested
      if (regenerateOnError) {
        generateCaptcha()
      }
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    clearError()
  }

  // Handle key press (Enter to submit)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled) {
      validateInput()
    }
  }

  // Generate complex background noise
  const generateNoise = useCallback(() => {
    const noise = []
    for (let i = 0; i < 50; i++) {
      noise.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.3 + 0.1,
      })
    }
    return noise
  }, [])

  // Generate random lines
  const generateLines = useCallback(() => {
    const lines = []
    for (let i = 0; i < 8; i++) {
      lines.push({
        x1: Math.random() * 100,
        y1: Math.random() * 100,
        x2: Math.random() * 100,
        y2: Math.random() * 100,
        stroke: `hsl(${Math.random() * 360}, 70%, 70%)`,
        opacity: Math.random() * 0.4 + 0.1,
      })
    }
    return lines
  }, [])

  // Generate background elements only once
  const [noise] = useState(() => generateNoise())
  const [lines] = useState(() => generateLines())

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("recaptcha.title")}</h3>
        <div className="flex items-center gap-1">
          <AudioCaptcha text={captchaText} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={generateCaptcha}
            disabled={disabled}
            className="h-7 w-7 p-0"
            title={t("recaptcha.refresh")}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("recaptcha.description")}</p>

      {/* Captcha Display with Complex Background */}
      <div className="relative flex items-center justify-center p-3 bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
        {/* Complex Background */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          {/* Random lines */}
          {lines.map((line, index) => (
            <line
              key={`line-${index}`}
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke={line.stroke}
              strokeWidth="1"
              opacity={line.opacity}
            />
          ))}
          {/* Noise dots */}
          {noise.map((dot, index) => (
            <circle
              key={`noise-${index}`}
              cx={`${dot.x}%`}
              cy={`${dot.y}%`}
              r={dot.size}
              fill={`hsl(${Math.random() * 360}, 70%, 70%)`}
              opacity={dot.opacity}
            />
          ))}
        </svg>
        
        {/* Captcha Text */}
        <div className="relative text-xl font-mono font-bold tracking-widest text-gray-800 select-none">
          {captchaText.split('').map((char, index) => {
            // Generate stable random values for each character
            const rotation = (index * 137.5) % 30 - 15 // Use golden angle for pseudo-random but stable rotation
            const scale = 0.8 + ((index * 97) % 40) / 100 // Stable scale variation
            const hue = (index * 137.5) % 360 // Stable color variation
            return (
              <span
                key={index}
                className="inline-block mx-0.5"
                style={{
                  transform: `rotate(${rotation}deg) scale(${scale})`,
                  color: `hsl(${hue}, 70%, 30%)`,
                  textShadow: `1px 1px 2px rgba(0,0,0,0.3)`,
                }}
              >
                {char}
              </span>
            )
          })}
        </div>
      </div>

      {/* User Input - Compact Design */}
      {!isVerified && (
        <div className="space-y-2">
          <Input
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={t("recaptcha.placeholder")}
            disabled={disabled}
            className="flex-1"
            maxLength={6}
            autoComplete="off"
          />
        </div>
      )}

      {/* Success State */}
      {isVerified && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
          {t("action.verify")} ✓
        </div>
      )}
    </div>
  )
} 
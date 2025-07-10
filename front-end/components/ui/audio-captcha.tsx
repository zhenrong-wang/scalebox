"use client"

import { useState, useRef } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "./button"

interface AudioCaptchaProps {
  text: string
  className?: string
}

export function AudioCaptcha({ text, className = "" }: AudioCaptchaProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speakText = () => {
    if (isMuted) return

    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    // Use Web Speech API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8 // Slightly slower for clarity
      utterance.pitch = 1
      utterance.volume = 1
      
      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = () => setIsPlaying(false)
      
      speechSynthesis.speak(utterance)
    } else {
      // Fallback: try to create audio element with TTS
      try {
        const audio = new Audio()
        audio.src = `data:audio/wav;base64,${btoa(text)}`
        audio.play()
        setIsPlaying(true)
        audio.onended = () => setIsPlaying(false)
        audioRef.current = audio
      } catch (error) {
        console.error('Audio playback not supported:', error)
      }
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (isPlaying) {
      speechSynthesis.cancel()
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlaying(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={speakText}
        disabled={isMuted}
        className="h-8 w-8 p-0"
        title="Listen to captcha"
      >
        {isPlaying ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleMute}
        className="h-8 w-8 p-0"
        title={isMuted ? "Unmute audio" : "Mute audio"}
      >
        <VolumeX className={`h-4 w-4 ${isMuted ? 'text-red-500' : 'text-muted-foreground'}`} />
      </Button>
    </div>
  )
} 
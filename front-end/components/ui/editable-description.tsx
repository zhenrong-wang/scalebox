"use client"

import { useState, useRef, useEffect } from "react"
import { Check, X, Edit } from "lucide-react"
import { Button } from "./button"
import { Textarea } from "./textarea"
import { useLanguage } from "@/contexts/language-context"

interface EditableDescriptionProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  placeholder?: string
  maxLength?: number
  className?: string
  disabled?: boolean
}

export function EditableDescription({
  value,
  onSave,
  placeholder = "Enter description...",
  maxLength = 500,
  className = "",
  disabled = false
}: EditableDescriptionProps) {
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    if (disabled) return
    setEditValue(value)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (editValue.trim() === value.trim()) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(editValue.trim())
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to save description:", error)
      // Keep editing mode on error so user can retry
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancel()
    }
  }

  // Handle click outside to cancel editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        // Check if the click is not on the save/cancel buttons
        const target = event.target as Element
        if (!target.closest('.editable-controls')) {
          handleCancel()
        }
      }
    }

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <div className={`flex items-start gap-2 ${className}`}>
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className="min-h-[60px] resize-none"
          disabled={isSaving}
        />
        <div className="flex flex-col gap-1 editable-controls">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 w-8 p-0"
            title={t("action.save") || "Save"}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-8 w-8 p-0"
            title={t("action.cancel") || "Cancel"}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`group relative ${className}`}>
      <div 
        className={`break-words cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors ${
          disabled ? "cursor-default hover:bg-transparent" : ""
        }`}
        onClick={handleStartEdit}
        title={disabled ? undefined : t("action.edit") || "Click to edit"}
      >
        {value || placeholder}
      </div>
      {!disabled && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStartEdit}
          className="absolute -top-1 -right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title={t("action.edit") || "Edit"}
        >
          <Edit className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
} 
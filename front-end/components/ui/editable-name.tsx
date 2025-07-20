"use client"

import { useState, useRef, useEffect } from "react"
import { Check, X, Edit, AlertTriangle } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { useLanguage } from "@/contexts/language-context"

interface EditableNameProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  onValidateDuplicate?: (newValue: string, currentValue: string) => boolean
  placeholder?: string
  maxLength?: number
  className?: string
  disabled?: boolean
  resourceType?: string // For better error messages
}

export function EditableName({
  value,
  onSave,
  onValidateDuplicate,
  placeholder = "Enter name...",
  maxLength = 100,
  className = "",
  disabled = false,
  resourceType = "item"
}: EditableNameProps) {
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [validationError, setValidationError] = useState<string>("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    if (disabled) return
    setEditValue(value)
    setValidationError("")
    setIsEditing(true)
  }

  const validateInput = (newValue: string): string => {
    if (!newValue.trim()) {
      return t("validation.nameRequired") || "Name is required"
    }
    
    if (newValue.trim().length < 2) {
      return t("validation.nameTooShort") || "Name must be at least 2 characters"
    }
    
    if (newValue.trim().length > maxLength) {
      return t("validation.nameTooLong") || `Name must be ${maxLength} characters or less`
    }
    
    if (onValidateDuplicate && onValidateDuplicate(newValue.trim(), value)) {
      return t("validation.nameDuplicate", { resourceType }) || `A ${resourceType} with this name already exists`
    }
    
    return ""
  }

  const handleSave = async () => {
    const trimmedValue = editValue.trim()
    
    // Validate input
    const error = validateInput(trimmedValue)
    if (error) {
      setValidationError(error)
      return
    }

    // Check if value actually changed
    if (trimmedValue === value.trim()) {
      setIsEditing(false)
      setValidationError("")
      return
    }

    setIsSaving(true)
    try {
      await onSave(trimmedValue)
      setIsEditing(false)
      setValidationError("")
    } catch (error) {
      console.error("Failed to save name:", error)
      // Keep editing mode on error so user can retry
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setValidationError("")
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setEditValue(newValue)
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("")
    }
  }

  // Handle click outside to cancel editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && inputRef.current && !inputRef.current.contains(event.target as Node)) {
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
        <div className="flex-1">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={isSaving}
            className={validationError ? "border-red-500 focus:border-red-500" : ""}
          />
          {validationError && (
            <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
              <AlertTriangle className="h-3 w-3" />
              {validationError}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 editable-controls">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving || !!validationError}
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
        className={`font-medium cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors ${
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
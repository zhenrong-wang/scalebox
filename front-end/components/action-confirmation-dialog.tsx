"use client"

import { useState } from "react"
import { AlertTriangle, Trash2, PowerOff, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "../contexts/language-context"

interface ActionConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  itemType: string
  action: "delete" | "disable" | "enable"
  isLoading?: boolean
  warningMessage?: string
  requireConfirmation?: boolean
}

export function ActionConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  action,
  isLoading = false,
  warningMessage,
  requireConfirmation = false,
}: ActionConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState("")
  const [error, setError] = useState("")
  const { t } = useLanguage()

  const handleConfirm = () => {
    if (requireConfirmation && confirmationText !== itemName) {
      setError(t("dialog.pleaseTypeToConfirm", { name: itemName }) || `Please type "${itemName}" exactly to confirm`)
      return
    }

    setError("")
    onConfirm()
  }

  const handleClose = () => {
    setConfirmationText("")
    setError("")
    onClose()
  }

  const isConfirmDisabled = (requireConfirmation && confirmationText !== itemName) || isLoading

  const getActionConfig = () => {
    switch (action) {
      case "delete":
        return {
          title: t("action.delete") || "Delete",
          description: t("dialog.deleteDescription", { itemType: itemType.toLowerCase() }) || `This action cannot be undone. This will permanently delete the ${itemType.toLowerCase()} and remove all associated data.`,
          buttonText: t("action.delete") || "Delete",
          buttonVariant: "destructive" as const,
          icon: Trash2,
          requireConfirmation: true,
        }
      case "disable":
        return {
          title: t("action.disable") || "Disable",
          description: t("dialog.disableDescription", { itemType: itemType.toLowerCase() }) || `This will disable the ${itemType.toLowerCase()} and prevent any further access.`,
          buttonText: t("action.disable") || "Disable",
          buttonVariant: "default" as const,
          icon: PowerOff,
          requireConfirmation: false,
        }
      case "enable":
        return {
          title: t("action.enable") || "Enable",
          description: t("dialog.enableDescription", { itemType: itemType.toLowerCase() }) || `This will enable the ${itemType.toLowerCase()} and allow access.`,
          buttonText: t("action.enable") || "Enable",
          buttonVariant: "default" as const,
          icon: Power,
          requireConfirmation: false,
        }
      default:
        return {
          title: t("action.confirm") || "Confirm",
          description: t("dialog.confirmDescription", { itemType: itemType.toLowerCase() }) || `Are you sure you want to perform this action on the ${itemType.toLowerCase()}?`,
          buttonText: t("action.confirm") || "Confirm",
          buttonVariant: "default" as const,
          icon: AlertTriangle,
          requireConfirmation: false,
        }
    }
  }

  const config = getActionConfig()
  const IconComponent = config.icon

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            {config.title} {itemType}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {warningMessage && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">{warningMessage}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground mb-1">{t("dialog.itemToBeActioned", { itemType, action: t(`action.${action}`) || action }) || `${itemType} to be ${action}d:`}</div>
            <div className="font-mono text-sm bg-background px-2 py-1 rounded border">{itemName}</div>
          </div>

          {requireConfirmation && (
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                {t("dialog.typeToConfirm", { name: itemName }) || `Type ${itemName} to confirm:`}
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => {
                  setConfirmationText(e.target.value)
                  if (error) setError("")
                }}
                placeholder={t("dialog.typeNameHere", { name: itemName }) || `Type "${itemName}" here`}
                className={error ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {error && <div className="text-sm text-destructive">{error}</div>}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t("action.cancel") || "Cancel"}
          </Button>
          <Button 
            variant={config.buttonVariant} 
            onClick={handleConfirm} 
            disabled={isConfirmDisabled} 
            className="gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("dialog.processing", { action: config.buttonText }) || `${config.buttonText}ing...`}
              </>
            ) : (
              <>
                <IconComponent className="h-4 w-4" />
                {config.buttonText} {itemType}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
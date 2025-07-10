"use client"

import { useState } from "react"
import { AlertTriangle, Trash2 } from "lucide-react"
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

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  itemType: string
  isLoading?: boolean
  warningMessage?: string
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isLoading = false,
  warningMessage,
}: DeleteConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState("")
  const [error, setError] = useState("")

  const handleConfirm = () => {
    if (confirmationText !== itemName) {
      setError(`Please type "${itemName}" exactly to confirm deletion`)
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

  const isConfirmDisabled = confirmationText !== itemName || isLoading

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {itemType}
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the {itemType.toLowerCase()} and remove all
            associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {warningMessage && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-destructive">{warningMessage}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground mb-1">{itemType} to be deleted:</div>
            <div className="font-mono text-sm bg-background px-2 py-1 rounded border">{itemName}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-semibold">{itemName}</span> to confirm deletion:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value)
                if (error) setError("")
              }}
              placeholder={`Type "${itemName}" here`}
              className={error ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isConfirmDisabled} className="gap-2">
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete {itemType}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

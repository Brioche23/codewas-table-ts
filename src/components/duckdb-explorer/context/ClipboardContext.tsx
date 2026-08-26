import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { Alert, Snackbar } from "@mui/material"
import { Check } from "@mui/icons-material"

type ClipboardContextValue = {
  /** Copy `text` to the clipboard and pop a success toast. Returns whether it succeeded. */
  copy: (text: string, message?: string) => Promise<boolean>
}

const ClipboardContext = createContext<ClipboardContextValue | null>(null)

type ToastState = { open: boolean; message: string; severity: "success" | "error" }

/**
 * Wraps the app so any component can call `useClipboard().copy(text)` to copy to the
 * clipboard and trigger a single, self-dismissing MUI Snackbar.
 */
export function ClipboardProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    severity: "success",
  })

  const copy = useCallback(async (text: string, message = "Copied") => {
    try {
      await navigator.clipboard.writeText(text)
      setToast({ open: true, message, severity: "success" })
      return true
    } catch {
      setToast({ open: true, message: "Copy failed", severity: "error" })
      return false
    }
  }, [])

  const handleClose = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }))
  }, [])

  return (
    <ClipboardContext.Provider value={{ copy }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={2000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          icon={toast.severity === "success" ? <Check fontSize="inherit" /> : undefined}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ClipboardContext.Provider>
  )
}

export function useClipboard() {
  const ctx = useContext(ClipboardContext)
  if (!ctx) {
    throw new Error("useClipboard must be used within a <ClipboardProvider>")
  }
  return ctx
}

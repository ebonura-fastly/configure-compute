import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { Text, Flex } from '@fastly/beacon-mantine'
import { IconCheckCircleFilled, IconAttentionFilled, IconClose } from '@fastly/beacon-icons'

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextType {
  show: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const AUTO_DISMISS_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast container */}
      <div className="cc-toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`cc-toast cc-toast--${toast.type}`}>
            <Flex align="center" gap="xs" style={{ flex: 1 }}>
              {toast.type === 'success' ? (
                <IconCheckCircleFilled width={16} height={16} style={{ flexShrink: 0, color: 'var(--COLOR--status--success, #22c55e)' }} />
              ) : (
                <IconAttentionFilled width={16} height={16} style={{ flexShrink: 0, color: 'var(--COLOR--status--error, #ef4444)' }} />
              )}
              <Text size="sm">{toast.message}</Text>
            </Flex>
            <button
              type="button"
              className="cc-toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
            >
              <IconClose width={14} height={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

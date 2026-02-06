import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type ConnectionMode = 'shared' | 'personal' | 'local' | 'disconnected'

interface ConnectionInfo {
  mode: ConnectionMode
  isConnected: boolean
  customerName: string | null
  isConnecting: boolean
}

interface FastlyConnectionContextType extends ConnectionInfo {
  /** Called by CCHeader dropdown to request a mode switch */
  requestSwitch: (to: 'shared' | 'personal' | 'local') => void
  /** Called by CCHeader dropdown to request disconnect */
  requestDisconnect: () => void
  /** Sidebar watches this to handle switch requests */
  pendingRequest: 'shared' | 'personal' | 'local' | 'disconnect' | null
  /** Sidebar calls this after updating connection state */
  setConnectionInfo: (info: ConnectionInfo) => void
  /** Sidebar calls this after handling a pending request */
  clearPendingRequest: () => void
}

const FastlyConnectionContext = createContext<FastlyConnectionContextType | null>(null)

export function FastlyConnectionProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<ConnectionInfo>({
    mode: 'disconnected',
    isConnected: false,
    customerName: null,
    isConnecting: true, // starts true; auto-connect resolves it
  })
  const [pendingRequest, setPendingRequest] = useState<'shared' | 'personal' | 'local' | 'disconnect' | null>(null)

  const setConnectionInfo = useCallback((update: ConnectionInfo) => {
    setInfo(update)
  }, [])

  const requestSwitch = useCallback((to: 'shared' | 'personal' | 'local') => {
    setPendingRequest(to)
  }, [])

  const requestDisconnect = useCallback(() => {
    setPendingRequest('disconnect')
  }, [])

  const clearPendingRequest = useCallback(() => {
    setPendingRequest(null)
  }, [])

  return (
    <FastlyConnectionContext.Provider value={{
      ...info,
      pendingRequest,
      setConnectionInfo,
      requestSwitch,
      requestDisconnect,
      clearPendingRequest,
    }}>
      {children}
    </FastlyConnectionContext.Provider>
  )
}

export function useFastlyConnection() {
  const ctx = useContext(FastlyConnectionContext)
  if (!ctx) throw new Error('useFastlyConnection must be used within FastlyConnectionProvider')
  return ctx
}

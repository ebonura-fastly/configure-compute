import { ThemeProvider, Global } from "@fastly/beacon"
import { ReactNode } from "react"

// Import Beacon CSS tokens
import "@fastly/beacon-tokens/aspen.css"

interface BeaconProviderProps {
  children: ReactNode
}

export function BeaconProvider({ children }: BeaconProviderProps) {
  return (
    <ThemeProvider tokenlyTheme="aspen">
      <Global reset />
      {children}
    </ThemeProvider>
  )
}

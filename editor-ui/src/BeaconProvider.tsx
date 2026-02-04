import { MantineProvider, createTheme, beaconMantineTheme } from "@fastly/beacon-mantine"
import { ReactNode } from "react"

// Import Beacon CSS tokens (design system variables)
import "@fastly/beacon-tokens/aspen.css"
// Mantine core styles - use layer.css for proper CSS layer ordering
import "@mantine/core/styles.layer.css"
// Beacon-mantine component styles (must come after mantine core)
import "@fastly/beacon-mantine/styles.css"

const mantineTheme = createTheme(beaconMantineTheme)

interface BeaconProviderProps {
  children: ReactNode
}

export function BeaconProvider({ children }: BeaconProviderProps) {
  return (
    <MantineProvider theme={mantineTheme}>
      {children}
    </MantineProvider>
  )
}

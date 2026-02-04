/**
 * VCE Theme System
 *
 * Uses CSS custom properties (defined in tokens.css) with data-theme attribute.
 * Theme is stored in localStorage and respects system preference.
 */

import { useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'vce-theme'

/**
 * Get initial theme from localStorage or system preference
 */
function getInitialTheme(): ThemeMode {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }

    // Fall back to system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  }

  return 'light'
}

/**
 * Apply theme to document
 */
function applyTheme(mode: ThemeMode) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode)
  }
}

/**
 * Hook to manage theme state
 *
 * Usage:
 * ```tsx
 * const { theme, isDark, toggle, setTheme } = useTheme()
 * ```
 */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getInitialTheme)

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  // Listen for system preference changes (only when no manual preference)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't set a manual preference
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setModeState(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggle = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const setTheme = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
  }, [])

  return {
    // New API
    mode,
    isDark: mode === 'dark',
    isLight: mode === 'light',
    toggle,
    setTheme,
    // Backward compatibility: theme as colors object
    theme: lightTheme,
    toggleTheme: toggle,
  }
}

/**
 * Initialize theme on app load (call once in main.tsx)
 * This ensures theme is applied before React hydration to prevent flash
 */
export function initializeTheme() {
  const theme = getInitialTheme()
  applyTheme(theme)
}

// =============================================================================
// Backward Compatibility Exports
// TODO: Remove these once all components are migrated to CSS classes
// =============================================================================

/** @deprecated Use CSS var(--font-family) instead */
export const fonts = {
  sans: 'var(--font-family)',
  mono: 'var(--font-family-mono)',
}

/** @deprecated Use CSS variables instead */
export type ThemeColors = {
  bg: string
  bgSecondary: string
  bgTertiary: string
  bgHover: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  borderLight: string
  primary: string
  primaryHover: string
  primaryLight: string
  success: string
  successBg: string
  successBorder: string
  warning: string
  warningBg: string
  error: string
  errorBg: string
  errorBorder: string
  nodeInput: { header: string; body: string; border: string; text: string }
  nodeCondition: { header: string; body: string; border: string; text: string }
  nodeLogic: { header: string; body: string; border: string; text: string }
  nodeAction: { header: string; body: string; border: string; text: string }
  nodeRouting: { header: string; body: string; border: string; text: string }
  portBool: string
  portString: string
  portNumber: string
  portGeometry: string
  portAny: string
  canvasBg: string
  canvasDots: string
  minimapMask: string
}

/** @deprecated Use CSS variables instead */
export const lightTheme: ThemeColors = {
  bg: 'var(--bg-primary)',
  bgSecondary: 'var(--bg-secondary)',
  bgTertiary: 'var(--bg-tertiary)',
  bgHover: 'var(--bg-hover)',
  text: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-disabled)',
  border: 'var(--border-primary)',
  borderLight: 'var(--border-secondary)',
  primary: 'var(--color-action)',
  primaryHover: 'var(--color-action-hover)',
  primaryLight: 'var(--color-action-surface)',
  success: 'var(--color-success)',
  successBg: 'var(--color-success-surface)',
  successBorder: 'var(--color-success)',
  warning: 'var(--color-warning)',
  warningBg: 'var(--color-warning-surface)',
  error: 'var(--color-error)',
  errorBg: 'var(--color-error-surface)',
  errorBorder: 'var(--color-error)',
  nodeInput: { header: 'var(--node-input-header)', body: 'var(--node-input-body)', border: 'var(--node-input-border)', text: 'var(--node-input-text)' },
  nodeCondition: { header: 'var(--node-condition-header)', body: 'var(--node-condition-body)', border: 'var(--node-condition-border)', text: 'var(--node-condition-text)' },
  nodeLogic: { header: 'var(--node-logic-header)', body: 'var(--node-logic-body)', border: 'var(--node-logic-border)', text: 'var(--node-logic-text)' },
  nodeAction: { header: 'var(--node-action-header)', body: 'var(--node-action-body)', border: 'var(--node-action-border)', text: 'var(--node-action-text)' },
  nodeRouting: { header: 'var(--node-routing-header)', body: 'var(--node-routing-body)', border: 'var(--node-routing-border)', text: 'var(--node-routing-text)' },
  portBool: 'var(--port-bool)',
  portString: 'var(--port-string)',
  portNumber: 'var(--port-number)',
  portGeometry: 'var(--port-geometry)',
  portAny: 'var(--port-any)',
  canvasBg: 'var(--canvas-bg)',
  canvasDots: 'var(--canvas-dots)',
  minimapMask: 'var(--canvas-minimap-mask)',
}

/** @deprecated Use CSS variables instead */
export const darkTheme: ThemeColors = lightTheme // Same object since CSS vars handle theming

/** @deprecated Use ThemeContext removal pattern */
export const ThemeContext = {
  Provider: ({ children }: { children: React.ReactNode }) => children,
}

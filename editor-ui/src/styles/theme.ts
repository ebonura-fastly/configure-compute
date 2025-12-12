// Fastly Design System Colors & Theme
import { createContext, useContext } from 'react'

export type ThemeMode = 'light' | 'dark'

export type ThemeColors = {
  // Backgrounds
  bg: string
  bgSecondary: string
  bgTertiary: string
  bgHover: string

  // Text
  text: string
  textSecondary: string
  textMuted: string

  // Borders
  border: string
  borderLight: string

  // Primary - Fastly Red
  primary: string
  primaryHover: string
  primaryLight: string

  // Semantic colors
  success: string
  successBg: string
  successBorder: string
  warning: string
  warningBg: string
  error: string
  errorBg: string
  errorBorder: string

  // Node category colors
  nodeInput: { header: string; body: string; border: string; text: string }
  nodeCondition: { header: string; body: string; border: string; text: string }
  nodeLogic: { header: string; body: string; border: string; text: string }
  nodeAction: { header: string; body: string; border: string; text: string }
  nodeRouting: { header: string; body: string; border: string; text: string }

  // Port colors
  portBool: string
  portString: string
  portNumber: string
  portGeometry: string
  portAny: string

  // Canvas
  canvasBg: string
  canvasDots: string
  minimapMask: string
}

export const lightTheme: ThemeColors = {
  // Backgrounds
  bg: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  bgTertiary: '#F3F4F6',
  bgHover: '#F3F4F6',

  // Text
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',

  // Borders
  border: '#E5E7EB',
  borderLight: '#D1D5DB',

  // Primary - Fastly Red
  primary: '#FF282D',
  primaryHover: '#E0232B',
  primaryLight: '#FFF0F0',

  // Semantic colors
  success: '#065F46',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  error: '#B91C1C',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',

  // Node category colors (Blender-style: colored header, neutral body)
  nodeInput: { header: '#e8a0a0', body: '#f5f5f5', border: '#d0d0d0', text: '#6b2b2b' },
  nodeCondition: { header: '#a0c0e8', body: '#f5f5f5', border: '#d0d0d0', text: '#2b4a6b' },
  nodeLogic: { header: '#a0e0b8', body: '#f5f5f5', border: '#d0d0d0', text: '#2b5a3b' },
  nodeAction: { header: '#c8a0e8', body: '#f5f5f5', border: '#d0d0d0', text: '#4a2b6b' },
  nodeRouting: { header: '#a0e0e0', body: '#f5f5f5', border: '#d0d0d0', text: '#2b5a5a' },

  // Port colors
  portBool: '#A78BFA',
  portString: '#34D399',
  portNumber: '#60A5FA',
  portGeometry: '#22D3EE',
  portAny: '#9CA3AF',

  // Canvas
  canvasBg: '#F9FAFB',
  canvasDots: '#D1D5DB',
  minimapMask: 'rgba(249, 250, 251, 0.8)',
}

export const darkTheme: ThemeColors = {
  // Backgrounds
  bg: '#1a1a2e',
  bgSecondary: '#16162a',
  bgTertiary: '#252540',
  bgHover: '#2a2a4a',

  // Text
  text: '#FFFFFF',
  textSecondary: '#E5E7EB',
  textMuted: '#9CA3AF',

  // Borders
  border: '#3a3a5a',
  borderLight: '#4a4a6a',

  // Primary - Fastly Red
  primary: '#FF282D',
  primaryHover: '#FF4A4E',
  primaryLight: '#3a1a1a',

  // Semantic colors
  success: '#4ADE80',
  successBg: '#1a3a2a',
  successBorder: '#2a5a3a',
  warning: '#FBBF24',
  warningBg: '#3a3a1a',
  error: '#F87171',
  errorBg: '#3a1a1a',
  errorBorder: '#5a2a2a',

  // Node category colors (Blender-style: colored header, neutral body)
  nodeInput: { header: '#6b2b2b', body: '#2d2d3a', border: '#4a4a5a', text: '#e8a0a0' },
  nodeCondition: { header: '#2b4a6b', body: '#2d2d3a', border: '#4a4a5a', text: '#a0c8e8' },
  nodeLogic: { header: '#2b5a3b', body: '#2d2d3a', border: '#4a4a5a', text: '#a0e8b8' },
  nodeAction: { header: '#4a2b6b', body: '#2d2d3a', border: '#4a4a5a', text: '#c8a0e8' },
  nodeRouting: { header: '#2b5a5a', body: '#2d2d3a', border: '#4a4a5a', text: '#a0e8e8' },

  // Port colors
  portBool: '#C4B5FD',
  portString: '#86EFAC',
  portNumber: '#93C5FD',
  portGeometry: '#67E8F9',
  portAny: '#9CA3AF',

  // Canvas
  canvasBg: '#0f0f1a',
  canvasDots: '#3a3a5a',
  minimapMask: 'rgba(15, 15, 26, 0.8)',
}

// Theme context
type ThemeContextType = {
  mode: ThemeMode
  theme: ThemeColors
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  theme: darkTheme,
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

// Typography
export const fonts = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
}

// Spacing
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
}

// Border radius
export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
}

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  dark: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
  },
}

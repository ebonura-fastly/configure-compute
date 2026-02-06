/**
 * CCHeader - Custom header matching Uniform's TopNav styling
 *
 * - 68px fixed height (matches --SIZE--TopNav--height)
 * - Fastly logo with vertical separator
 * - Title
 * - Customer badge with account switching dropdown
 * - Sun/moon theme toggle
 */

import { Text, Loader, Menu } from '@fastly/beacon-mantine'
import { IconFastlyLogoSquare } from '@fastly/beacon-icons/logos'
import { IconCheckCircleFilled, IconClose } from '@fastly/beacon-icons'
import { useTheme } from '../styles/theme'
import { useFastlyConnection, type ConnectionMode } from '../hooks/useFastlyConnection'
import './CCHeader.css'

// z-index must be above the navbar (400)
const MENU_Z_INDEX = 500

interface CCHeaderProps {
  title?: string
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CheckIcon({ active }: { active: boolean }) {
  return (
    <IconCheckCircleFilled
      width={14}
      height={14}
      style={{ color: active ? 'var(--COLOR--status--success, #22c55e)' : 'var(--COLOR--text--tertiary, #9ca3af)' }}
    />
  )
}

function EmptyIcon() {
  return <span style={{ width: 14, height: 14, display: 'inline-block' }} />
}

function ModeMenuItem({ label, mode, currentMode, isConnected, isConnecting, onClick }: {
  label: string
  mode: ConnectionMode
  currentMode: ConnectionMode
  isConnected: boolean
  isConnecting: boolean
  onClick: () => void
}) {
  const isSelected = mode === currentMode
  let icon: React.ReactNode
  if (isSelected && isConnecting) {
    icon = <Loader size={14} />
  } else if (isSelected) {
    icon = <CheckIcon active={isConnected} />
  } else {
    icon = <EmptyIcon />
  }
  return (
    <Menu.Item
      leftSection={icon}
      onClick={onClick}
      disabled={isSelected && (isConnected || isConnecting)}
      style={isSelected ? { opacity: 1, fontWeight: 600 } : undefined}
    >
      {label}
    </Menu.Item>
  )
}

function ConnectionBadge() {
  const connection = useFastlyConnection()

  // Badge label and style depend on current state
  let badgeClass = 'cc-topnav-badge'
  let badgeContent: React.ReactNode

  if (connection.isConnecting && !connection.isConnected) {
    badgeContent = (
      <>
        <Loader size="xs" />
        <Text size="xs" className="cc-text-muted">Connecting...</Text>
      </>
    )
  } else if (connection.mode === 'local') {
    badgeClass += ' cc-topnav-badge--local'
    badgeContent = (
      <>
        <Text size="sm" weight="bold">Local Dev</Text>
        <ChevronDownIcon />
      </>
    )
  } else if (connection.isConnected) {
    badgeClass += ' cc-topnav-badge--connected'
    badgeContent = (
      <>
        <span className="cc-topnav-badge-dot" />
        <Text size="sm" weight="bold">
          {connection.customerName || 'Connected'}
        </Text>
        <ChevronDownIcon />
      </>
    )
  } else {
    badgeClass += ' cc-topnav-badge--disconnected'
    badgeContent = (
      <>
        <span className="cc-topnav-badge-dot cc-topnav-badge-dot--inactive" />
        <Text size="xs" className="cc-text-muted">Not Connected</Text>
        <ChevronDownIcon />
      </>
    )
  }

  // While connecting, show badge without dropdown
  if (connection.isConnecting && !connection.isConnected) {
    return <div className={badgeClass}>{badgeContent}</div>
  }

  return (
    <Menu shadow="md" width={240} position="bottom-end" zIndex={MENU_Z_INDEX}>
      <Menu.Target>
        <button type="button" className={badgeClass}>
          {badgeContent}
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Connection Mode</Menu.Label>
        <ModeMenuItem
          label="Shared Token"
          mode="shared"
          currentMode={connection.mode}
          isConnected={connection.isConnected}
          isConnecting={connection.isConnecting}
          onClick={() => connection.requestSwitch('shared')}
        />
        <ModeMenuItem
          label="Personal Token"
          mode="personal"
          currentMode={connection.mode}
          isConnected={connection.isConnected}
          isConnecting={connection.isConnecting}
          onClick={() => connection.requestSwitch('personal')}
        />
        {import.meta.env.DEV && (
          <ModeMenuItem
            label="Local Dev"
            mode="local"
            currentMode={connection.mode}
            isConnected={connection.isConnected}
            isConnecting={connection.isConnecting}
            onClick={() => connection.requestSwitch('local')}
          />
        )}
        {connection.isConnected && (
          <>
            <Menu.Divider />
            {connection.customerName && (
              <Menu.Item disabled style={{ opacity: 0.6 }}>
                <Text size="xs">{connection.customerName}</Text>
              </Menu.Item>
            )}
            {connection.mode === 'personal' && (
              <Menu.Item
                leftSection={<IconClose width={14} height={14} />}
                color="red"
                onClick={() => connection.requestDisconnect()}
              >
                Disconnect
              </Menu.Item>
            )}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  )
}

export function CCHeader({ title = 'Configure Compute' }: CCHeaderProps) {
  const { isDark, toggle } = useTheme()

  return (
    <header className="cc-topnav">
      {/* Logo with separator */}
      <div className="cc-topnav-logo">
        <div className="cc-topnav-logo-icon">
          <IconFastlyLogoSquare />
        </div>
      </div>

      {/* Title */}
      <div className="cc-topnav-title">
        <Text size="md" weight="bold">
          {title}
        </Text>
      </div>

      {/* Spacer */}
      <div className="cc-topnav-spacer" />

      {/* Connection Badge */}
      <ConnectionBadge />

      {/* Theme Toggle */}
      <button
        type="button"
        className="cc-topnav-theme-btn"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={toggle}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  )
}

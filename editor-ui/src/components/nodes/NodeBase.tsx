import { Handle, Position, NodeResizer } from '@xyflow/react'
import { useState, type ReactNode } from 'react'
import { Box, Flex, Text, Select, Switch, TextInput, type SelectOptionType } from '@fastly/beacon'
import { IconHelp } from '@fastly/beacon-icons'

type PortDef = {
  id: string
  label: string
  type: 'bool' | 'string' | 'number' | 'geometry' | 'any'
}

type NodeBaseProps = {
  title: string
  category: 'input' | 'condition' | 'logic' | 'action' | 'routing'
  selected?: boolean
  collapsed?: boolean
  inputs?: PortDef[]
  outputs?: PortDef[]
  children?: ReactNode
  width?: number
  minWidth?: number
  maxWidth?: number
  resizable?: boolean
  docUrl?: string
}

// Layout constants
const HEADER_HEIGHT = 38
const PORT_ROW_HEIGHT = 28
const PORT_SECTION_PADDING = 8
const HANDLE_SIZE = 12

export function NodeBase({
  title,
  category,
  selected = false,
  collapsed: initialCollapsed = false,
  inputs = [],
  outputs = [],
  children,
  width = 220,
  minWidth = 180,
  maxWidth = 400,
  resizable = false,
  docUrl,
}: NodeBaseProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const maxPorts = Math.max(inputs.length, outputs.length)

  // Calculate handle positions - must match the visual row positions exactly
  const getHandleTop = (idx: number) => {
    return HEADER_HEIGHT + PORT_SECTION_PADDING + idx * PORT_ROW_HEIGHT + PORT_ROW_HEIGHT / 2
  }

  const nodeStyle: React.CSSProperties = resizable
    ? { width: '100%', minWidth, maxWidth, height: '100%' }
    : { width }

  return (
    <Box
      className="vce-node"
      data-category={category}
      data-selected={selected}
      style={nodeStyle}
    >
      {resizable && (
        <NodeResizer
          minWidth={minWidth}
          maxWidth={maxWidth}
          minHeight={100}
          isVisible={selected}
          lineClassName="vce-node-resizer-line"
          handleClassName="vce-node-resizer-handle"
        />
      )}

      {/* Header */}
      <Flex
        className="vce-node-header"
        onClick={() => setCollapsed(!collapsed)}
        alignItems="center"
        justifyContent="space-between"
      >
        <Flex alignItems="center" gap="xs">
          <Text size="xs" className="vce-node-collapse-icon">{collapsed ? '▸' : '▾'}</Text>
          <Text size="sm" weight="semibold" className="vce-node-title">{title}</Text>
        </Flex>
        {docUrl && (
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="View documentation"
            className="vce-node-doc-link"
          >
            <IconHelp width={14} height={14} />
          </a>
        )}
      </Flex>

      {/* Handles - positioned absolutely relative to the node */}
      {inputs.map((port, idx) => (
        <Handle
          key={`in-${port.id}`}
          type="target"
          position={Position.Left}
          id={port.id}
          className="vce-handle"
          data-port-type={port.type}
          style={{ top: collapsed ? HEADER_HEIGHT / 2 : getHandleTop(idx) }}
        />
      ))}

      {outputs.map((port, idx) => (
        <Handle
          key={`out-${port.id}`}
          type="source"
          position={Position.Right}
          id={port.id}
          className="vce-handle"
          data-port-type={port.type}
          style={{ top: collapsed ? HEADER_HEIGHT / 2 : getHandleTop(idx) }}
        />
      ))}

      {/* Body (collapsible) */}
      {!collapsed && (
        <Box className="vce-node-body">
          {/* Port labels - rows must match handle positions */}
          {maxPorts > 0 && (
            <Flex className="vce-port-rows" justifyContent="space-between">
              {/* Left ports labels */}
              <Box className="vce-port-column vce-port-column--left">
                {inputs.map((port) => (
                  <Text key={port.id} size="xs" className="vce-port-label">
                    {port.label}
                  </Text>
                ))}
              </Box>
              {/* Right ports labels */}
              <Box className="vce-port-column vce-port-column--right">
                {outputs.map((port) => (
                  <Text key={port.id} size="xs" className="vce-port-label">
                    {port.label}
                  </Text>
                ))}
              </Box>
            </Flex>
          )}

          {/* Node content (form fields) */}
          {children && (
            <Box className={`vce-node-content ${maxPorts > 0 ? 'vce-node-content--with-ports' : ''}`}>
              {children}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

// Form field components for inline editing
export function NodeField({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Box className="vce-node-field" marginBottom="xs">
      <Text as="label" size="xs" color="muted" className="vce-node-field-label">
        {label}
      </Text>
      <Box className="vce-node-field-input">{children}</Box>
    </Box>
  )
}

export function NodeSelect({
  value,
  onChange,
  options
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const selectedOption = options.find(opt => opt.value === value) || null

  // Wrapper with nodrag class + event stopping prevents React Flow from intercepting
  return (
    <div
      className="nodrag nopan"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select
        value={selectedOption}
        onChange={(option) => {
          if (option) {
            onChange((option as SelectOptionType).value)
          }
        }}
        options={options}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuShouldBlockScroll={true}
        blurInputOnSelect={true}
        classNamePrefix="vce-select"
        className="vce-node-select-beacon"
        styles={{
          control: (base) => ({
            ...base,
            minHeight: '28px',
            fontSize: '12px',
          }),
          valueContainer: (base) => ({
            ...base,
            padding: '0 6px',
          }),
          input: (base) => ({
            ...base,
            margin: 0,
            padding: 0,
          }),
          indicatorsContainer: (base) => ({
            ...base,
            height: '28px',
          }),
          menu: (base) => ({
            ...base,
            zIndex: 9999,
            width: 'max-content',
            minWidth: '100%',
            maxWidth: '300px',
          }),
          menuList: (base) => ({
            ...base,
            maxHeight: '200px',
          }),
          option: (base) => ({
            ...base,
            fontSize: '12px',
            padding: '6px 10px',
          }),
        }}
      />
    </div>
  )
}

export function NodeInput({
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
}) {
  return (
    <div
      className="nodrag nopan vce-node-input-wrapper"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TextInput
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="vce-node-input-beacon"
      />
    </div>
  )
}

export function NodeCheckbox({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <Flex
      alignItems="center"
      gap="xs"
      className="nodrag nopan vce-node-checkbox"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Switch
        checked={checked}
        onChange={onChange}
        size="sm"
      />
      <Text size="xs">{label}</Text>
    </Flex>
  )
}

export function NodeSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Box className="vce-node-section">
      <Flex
        className="vce-node-section-header"
        onClick={() => setIsOpen(!isOpen)}
        alignItems="center"
        gap="xs"
      >
        <Text size="xs" className="vce-node-section-icon">{isOpen ? '▾' : '▸'}</Text>
        <Text size="xs" weight="semibold" className="vce-node-section-title">{title}</Text>
      </Flex>
      {isOpen && (
        <Box className="vce-node-section-content" paddingLeft="sm">
          {children}
        </Box>
      )}
    </Box>
  )
}

export function NodeTextarea({
  value,
  onChange,
  placeholder,
  minRows = 1,
  maxRows = 5,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRows?: number
  maxRows?: number
}) {
  // Calculate rows based on content
  const lineCount = (value || '').split('\n').length
  const estimatedWrapLines = Math.ceil((value || '').length / 25)
  const rows = Math.min(maxRows, Math.max(minRows, lineCount, estimatedWrapLines))

  return (
    <div
      className="nodrag nopan"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="vce-node-textarea"
      />
    </div>
  )
}

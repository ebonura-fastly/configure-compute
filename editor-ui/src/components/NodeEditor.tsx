import type { Node } from '@xyflow/react'

type Props = {
  node: Node | null
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onClose: () => void
}

const FIELDS = ['path', 'ip', 'country', 'device', 'useragent', 'header', 'method']
const OPERATORS = {
  path: ['equals', 'startsWith', 'contains', 'matches'],
  ip: ['equals', 'inRange'],
  country: ['equals', 'in', 'notIn'],
  device: ['is', 'isNot'],
  useragent: ['equals', 'contains', 'matches'],
  header: ['exists', 'notExists', 'equals', 'contains'],
  method: ['equals', 'in']
}
const LOGIC_OPS = ['AND', 'OR', 'NOT']
const ACTIONS = ['block', 'allow', 'challenge', 'log']

export function NodeEditor({ node, onUpdate, onClose }: Props) {
  if (!node) return null

  const update = (key: string, value: unknown) => {
    onUpdate(node.id, { ...node.data, [key]: value })
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>Edit {node.type}</span>
        <button onClick={onClose} style={closeStyle}>×</button>
      </div>

      {node.type === 'condition' && (
        <div style={formStyle}>
          <label>
            Field
            <select
              value={(node.data as { field?: string }).field || 'path'}
              onChange={(e) => update('field', e.target.value)}
              style={inputStyle}
            >
              {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label>
            Operator
            <select
              value={(node.data as { operator?: string }).operator || 'equals'}
              onChange={(e) => update('operator', e.target.value)}
              style={inputStyle}
            >
              {(OPERATORS[(node.data as { field?: string }).field as keyof typeof OPERATORS] || OPERATORS.path).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </label>
          <label>
            Value
            <input
              type="text"
              value={(node.data as { value?: string }).value || ''}
              onChange={(e) => update('value', e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
      )}

      {node.type === 'logic' && (
        <div style={formStyle}>
          <label>
            Operation
            <select
              value={(node.data as { operation?: string }).operation || 'AND'}
              onChange={(e) => update('operation', e.target.value)}
              style={inputStyle}
            >
              {LOGIC_OPS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </label>
        </div>
      )}

      {node.type === 'action' && (
        <div style={formStyle}>
          <label>
            Action
            <select
              value={(node.data as { action?: string }).action || 'block'}
              onChange={(e) => update('action', e.target.value)}
              style={inputStyle}
            >
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label>
            Status Code
            <input
              type="number"
              value={(node.data as { statusCode?: number }).statusCode || 403}
              onChange={(e) => update('statusCode', parseInt(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label>
            Message
            <input
              type="text"
              value={(node.data as { message?: string }).message || ''}
              onChange={(e) => update('message', e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
      )}
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  right: 10,
  top: 10,
  width: 250,
  background: '#2a2a40',
  borderRadius: 8,
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  color: 'white',
  zIndex: 10
}

const headerStyle: React.CSSProperties = {
  padding: '10px 15px',
  borderBottom: '1px solid #444',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontWeight: 'bold'
}

const closeStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  fontSize: 20,
  cursor: 'pointer'
}

const formStyle: React.CSSProperties = {
  padding: 15,
  display: 'flex',
  flexDirection: 'column',
  gap: 12
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  marginTop: 4,
  background: '#1a1a2e',
  border: '1px solid #444',
  borderRadius: 4,
  color: 'white',
  fontSize: 13
}

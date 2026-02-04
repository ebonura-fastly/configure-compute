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
    <div className="vce-node-editor">
      <div className="vce-node-editor-header">
        <span>Edit {node.type}</span>
        <button onClick={onClose} className="vce-node-editor-close">×</button>
      </div>

      {node.type === 'condition' && (
        <div className="vce-node-editor-form">
          <label className="vce-node-editor-label">
            Field
            <select
              value={(node.data as { field?: string }).field || 'path'}
              onChange={(e) => update('field', e.target.value)}
              className="form-select"
            >
              {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="vce-node-editor-label">
            Operator
            <select
              value={(node.data as { operator?: string }).operator || 'equals'}
              onChange={(e) => update('operator', e.target.value)}
              className="form-select"
            >
              {(OPERATORS[(node.data as { field?: string }).field as keyof typeof OPERATORS] || OPERATORS.path).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </label>
          <label className="vce-node-editor-label">
            Value
            <input
              type="text"
              value={(node.data as { value?: string }).value || ''}
              onChange={(e) => update('value', e.target.value)}
              className="form-input"
            />
          </label>
        </div>
      )}

      {node.type === 'logic' && (
        <div className="vce-node-editor-form">
          <label className="vce-node-editor-label">
            Operation
            <select
              value={(node.data as { operation?: string }).operation || 'AND'}
              onChange={(e) => update('operation', e.target.value)}
              className="form-select"
            >
              {LOGIC_OPS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </label>
        </div>
      )}

      {node.type === 'action' && (
        <div className="vce-node-editor-form">
          <label className="vce-node-editor-label">
            Action
            <select
              value={(node.data as { action?: string }).action || 'block'}
              onChange={(e) => update('action', e.target.value)}
              className="form-select"
            >
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="vce-node-editor-label">
            Status Code
            <input
              type="number"
              value={(node.data as { statusCode?: number }).statusCode || 403}
              onChange={(e) => update('statusCode', parseInt(e.target.value))}
              className="form-input"
            />
          </label>
          <label className="vce-node-editor-label">
            Message
            <input
              type="text"
              value={(node.data as { message?: string }).message || ''}
              onChange={(e) => update('message', e.target.value)}
              className="form-input"
            />
          </label>
        </div>
      )}
    </div>
  )
}

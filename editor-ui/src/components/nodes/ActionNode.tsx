import { type NodeProps, useReactFlow } from '@xyflow/react'
import { useCallback } from 'react'
import { NodeBase, NodeField, NodeSelect, NodeInput } from './NodeBase'

export type ActionNodeData = {
  action: 'block' | 'allow' | 'challenge' | 'log'
  statusCode?: number
  message?: string
}

const actionOptions = [
  { value: 'block', label: 'Block' },
  { value: 'allow', label: 'Allow' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'log', label: 'Log Only' },
]

const statusCodeOptions = [
  { value: '403', label: '403 Forbidden' },
  { value: '400', label: '400 Bad Request' },
  { value: '429', label: '429 Too Many Requests' },
  { value: '503', label: '503 Service Unavailable' },
]

export function ActionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ActionNodeData
  const { setNodes } = useReactFlow()
  const action = nodeData.action || 'block'

  const updateData = useCallback((field: string, value: string | number) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    )
  }, [id, setNodes])

  // Title varies by action type
  const titles: Record<string, string> = {
    block: 'Block',
    allow: 'Allow',
    challenge: 'Challenge',
    log: 'Log',
  }

  return (
    <NodeBase
      title={titles[action] || 'Action'}
      category="action"
      selected={selected}
      inputs={[{ id: 'trigger', label: 'Trigger', type: 'bool' }]}
      outputs={[]}
      width={200}
    >
      <NodeField label="Action">
        <NodeSelect
          value={action}
          onChange={(v) => updateData('action', v)}
          options={actionOptions}
        />
      </NodeField>

      {action === 'block' && (
        <>
          <NodeField label="Status">
            <NodeSelect
              value={String(nodeData.statusCode || 403)}
              onChange={(v) => updateData('statusCode', parseInt(v))}
              options={statusCodeOptions}
            />
          </NodeField>

          <NodeField label="Message">
            <NodeInput
              value={nodeData.message || ''}
              onChange={(v) => updateData('message', v)}
              placeholder="Response message..."
            />
          </NodeField>
        </>
      )}

      {action === 'log' && (
        <NodeField label="Message">
          <NodeInput
            value={nodeData.message || ''}
            onChange={(v) => updateData('message', v)}
            placeholder="Log message..."
          />
        </NodeField>
      )}
    </NodeBase>
  )
}

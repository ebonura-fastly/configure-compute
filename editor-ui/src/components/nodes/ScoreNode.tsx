import { type NodeProps, useReactFlow } from '@xyflow/react'
import { useCallback } from 'react'
import { NodeBase, NodeField, NodeSelect, NodeInput } from './NodeBase'

export type ScoreNodeData = {
  operation: 'add' | 'set' | 'threshold'
  value: number
  threshold?: number
}

const operationOptions = [
  { value: 'add', label: 'Add to Score' },
  { value: 'set', label: 'Set Score' },
  { value: 'threshold', label: 'Check Threshold' },
]

export function ScoreNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ScoreNodeData
  const { setNodes } = useReactFlow()

  const updateData = useCallback((field: string, value: string | number) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    )
  }, [id, setNodes])

  const operation = nodeData.operation || 'add'
  const value = nodeData.value ?? 10

  // Dynamic title based on operation
  const titles: Record<string, string> = {
    add: 'Add Score',
    set: 'Set Score',
    threshold: 'Score Check',
  }

  // Different inputs/outputs based on operation
  const isThreshold = operation === 'threshold'

  return (
    <NodeBase
      title={titles[operation] || 'Score'}
      category="logic"
      selected={selected}
      inputs={[
        { id: 'trigger', label: 'Trigger', type: 'bool' },
        ...(isThreshold ? [] : [{ id: 'score_in', label: 'Score In', type: 'number' as const }]),
      ]}
      outputs={[
        ...(isThreshold
          ? [
              { id: 'exceeded', label: 'Exceeded', type: 'bool' as const },
              { id: 'ok', label: 'OK', type: 'bool' as const },
            ]
          : [{ id: 'score_out', label: 'Score Out', type: 'number' as const }]
        ),
      ]}
      width={180}
    >
      <NodeField label="Mode">
        <NodeSelect
          value={operation}
          onChange={(v) => updateData('operation', v)}
          options={operationOptions}
        />
      </NodeField>

      {operation === 'add' && (
        <NodeField label="Points">
          <NodeInput
            value={value}
            onChange={(v) => updateData('value', parseInt(v) || 0)}
            type="number"
            placeholder="10"
          />
        </NodeField>
      )}

      {operation === 'set' && (
        <NodeField label="Value">
          <NodeInput
            value={value}
            onChange={(v) => updateData('value', parseInt(v) || 0)}
            type="number"
            placeholder="0"
          />
        </NodeField>
      )}

      {operation === 'threshold' && (
        <NodeField label="Threshold">
          <NodeInput
            value={nodeData.threshold ?? 50}
            onChange={(v) => updateData('threshold', parseInt(v) || 0)}
            type="number"
            placeholder="50"
          />
        </NodeField>
      )}
    </NodeBase>
  )
}

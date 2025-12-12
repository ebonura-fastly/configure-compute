import { type NodeProps, useReactFlow } from '@xyflow/react'
import { useCallback } from 'react'
import { NodeBase, NodeField, NodeSelect } from './NodeBase'

export type LogicNodeData = {
  operation: 'AND' | 'OR' | 'NOT'
}

const operationOptions = [
  { value: 'AND', label: 'AND (all match)' },
  { value: 'OR', label: 'OR (any match)' },
  { value: 'NOT', label: 'NOT (invert)' },
]

export function LogicNode({ id, data, selected }: NodeProps) {
  const nodeData = data as LogicNodeData
  const { setNodes } = useReactFlow()
  const operation = nodeData.operation || 'AND'

  const updateData = useCallback((value: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, operation: value } }
          : node
      )
    )
  }, [id, setNodes])

  // Different input count based on operation
  const inputs = operation === 'NOT'
    ? [{ id: 'in', label: 'Input', type: 'bool' as const }]
    : [
        { id: 'in0', label: 'Input A', type: 'bool' as const },
        { id: 'in1', label: 'Input B', type: 'bool' as const },
      ]

  return (
    <NodeBase
      title={operation}
      category="logic"
      selected={selected}
      inputs={inputs}
      outputs={[
        { id: 'true', label: 'True', type: 'bool' },
        { id: 'false', label: 'False', type: 'bool' },
      ]}
      width={160}
    >
      <NodeField label="Operation">
        <NodeSelect
          value={operation}
          onChange={updateData}
          options={operationOptions}
        />
      </NodeField>
    </NodeBase>
  )
}

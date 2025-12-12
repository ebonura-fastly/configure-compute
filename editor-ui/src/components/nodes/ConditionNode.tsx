import { type NodeProps, useReactFlow } from '@xyflow/react'
import { useCallback } from 'react'
import { NodeBase, NodeField, NodeSelect, NodeInput } from './NodeBase'

export type ConditionNodeData = {
  field: string
  operator: string
  value: string
}

const fieldOptions = [
  { value: 'path', label: 'Path' },
  { value: 'method', label: 'Method' },
  { value: 'clientIp', label: 'Client IP' },
  { value: 'country', label: 'Country' },
  { value: 'userAgent', label: 'User Agent' },
  { value: 'host', label: 'Host' },
  { value: 'header', label: 'Header' },
  { value: 'asn', label: 'ASN' },
  { value: 'ja3', label: 'JA3 Fingerprint' },
]

const operatorOptions = [
  { value: 'equals', label: 'equals' },
  { value: 'notEquals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'notContains', label: 'not contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'matches', label: 'matches (regex)' },
  { value: 'in', label: 'in list' },
  { value: 'notIn', label: 'not in list' },
  { value: 'inCidr', label: 'in CIDR' },
]

export function ConditionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ConditionNodeData
  const { setNodes } = useReactFlow()

  const updateData = useCallback((field: string, value: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    )
  }, [id, setNodes])

  return (
    <NodeBase
      title="Condition"
      category="condition"
      selected={selected}
      inputs={[{ id: 'trigger', label: 'Trigger', type: 'bool' }]}
      outputs={[
        { id: 'true', label: 'True', type: 'bool' },
        { id: 'false', label: 'False', type: 'bool' },
      ]}
      width={220}
    >
      <NodeField label="Field">
        <NodeSelect
          value={nodeData.field || 'path'}
          onChange={(v) => updateData('field', v)}
          options={fieldOptions}
        />
      </NodeField>

      <NodeField label="Operator">
        <NodeSelect
          value={nodeData.operator || 'equals'}
          onChange={(v) => updateData('operator', v)}
          options={operatorOptions}
        />
      </NodeField>

      <NodeField label="Value">
        <NodeInput
          value={nodeData.value || ''}
          onChange={(v) => updateData('value', v)}
          placeholder="Enter value..."
        />
      </NodeField>
    </NodeBase>
  )
}

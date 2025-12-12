import { type NodeProps, useReactFlow } from '@xyflow/react'
import { useCallback } from 'react'
import { NodeBase, NodeField, NodeSelect, NodeInput, NodeCheckbox } from './NodeBase'

export type BackendNodeData = {
  name: string
  host: string
  port: number
  useTLS: boolean
  connectTimeout: number
  firstByteTimeout: number
  betweenBytesTimeout: number
  healthCheck?: string
}

const healthCheckOptions = [
  { value: 'none', label: 'None' },
  { value: 'tcp', label: 'TCP Connect' },
  { value: 'http', label: 'HTTP GET' },
  { value: 'https', label: 'HTTPS GET' },
]

export function BackendNode({ id, data, selected }: NodeProps) {
  const nodeData = data as BackendNodeData
  const { setNodes } = useReactFlow()

  const updateData = useCallback((field: string, value: string | number | boolean) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    )
  }, [id, setNodes])

  const name = nodeData.name || 'origin'
  const host = nodeData.host || 'origin.example.com'
  const port = nodeData.port ?? 443
  const useTLS = nodeData.useTLS ?? true

  return (
    <NodeBase
      title={`Backend: ${name}`}
      category="routing"
      selected={selected}
      inputs={[
        { id: 'route', label: 'Route', type: 'bool' },
      ]}
      outputs={[
        { id: 'response', label: 'Response', type: 'geometry' },
        { id: 'error', label: 'Error', type: 'bool' },
      ]}
      width={220}
    >
      <NodeField label="Name">
        <NodeInput
          value={name}
          onChange={(v) => updateData('name', v)}
          placeholder="origin"
        />
      </NodeField>

      <NodeField label="Host">
        <NodeInput
          value={host}
          onChange={(v) => updateData('host', v)}
          placeholder="origin.example.com"
        />
      </NodeField>

      <NodeField label="Port">
        <NodeInput
          value={port}
          onChange={(v) => updateData('port', parseInt(v) || 443)}
          type="number"
          placeholder="443"
        />
      </NodeField>

      <NodeCheckbox
        checked={useTLS}
        onChange={(v) => updateData('useTLS', v)}
        label="Use TLS/SSL"
      />

      <div style={{ marginTop: 8 }}>
        <NodeField label="Health">
          <NodeSelect
            value={nodeData.healthCheck || 'none'}
            onChange={(v) => updateData('healthCheck', v)}
            options={healthCheckOptions}
          />
        </NodeField>
      </div>
    </NodeBase>
  )
}

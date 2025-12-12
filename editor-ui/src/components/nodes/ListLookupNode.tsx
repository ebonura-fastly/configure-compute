import { type NodeProps, useReactFlow } from '@xyflow/react'
import { useCallback } from 'react'
import { NodeBase, NodeField, NodeSelect, NodeInput } from './NodeBase'

export type ListLookupNodeData = {
  listType: 'ip_blocklist' | 'ip_allowlist' | 'bot_signatures' | 'threat_intel' | 'custom'
  listName?: string
  field: 'clientIp' | 'userAgent' | 'ja3' | 'asn'
}

const listTypeOptions = [
  { value: 'ip_blocklist', label: 'IP Blocklist' },
  { value: 'ip_allowlist', label: 'IP Allowlist' },
  { value: 'bot_signatures', label: 'Bot Signatures' },
  { value: 'threat_intel', label: 'Threat Intel Feed' },
  { value: 'custom', label: 'Custom List' },
]

const fieldOptions = [
  { value: 'clientIp', label: 'Client IP' },
  { value: 'userAgent', label: 'User Agent' },
  { value: 'ja3', label: 'JA3 Fingerprint' },
  { value: 'asn', label: 'ASN' },
]

export function ListLookupNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ListLookupNodeData
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

  const listType = nodeData.listType || 'ip_blocklist'
  const fieldValue = nodeData.field || 'clientIp'

  // Dynamic title based on list type
  const titles: Record<string, string> = {
    ip_blocklist: 'IP Blocklist',
    ip_allowlist: 'IP Allowlist',
    bot_signatures: 'Bot Check',
    threat_intel: 'Threat Intel',
    custom: 'List Lookup',
  }

  return (
    <NodeBase
      title={titles[listType] || 'List Lookup'}
      category="condition"
      selected={selected}
      inputs={[{ id: 'trigger', label: 'Trigger', type: 'bool' }]}
      outputs={[
        { id: 'found', label: 'Found', type: 'bool' },
        { id: 'notFound', label: 'Not Found', type: 'bool' },
      ]}
      width={200}
    >
      <NodeField label="List">
        <NodeSelect
          value={listType}
          onChange={(v) => updateData('listType', v)}
          options={listTypeOptions}
        />
      </NodeField>

      <NodeField label="Check">
        <NodeSelect
          value={fieldValue}
          onChange={(v) => updateData('field', v)}
          options={fieldOptions}
        />
      </NodeField>

      {listType === 'custom' && (
        <NodeField label="Name">
          <NodeInput
            value={nodeData.listName || ''}
            onChange={(v) => updateData('listName', v)}
            placeholder="my_custom_list"
          />
        </NodeField>
      )}
    </NodeBase>
  )
}

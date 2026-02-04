import { useState, useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { Button, Flex, Text, TextInput, Switch, Alert, Pill } from '@fastly/beacon'
import {
  validateGraph,
  generateCompressedConfigStoreContent,
  generateFastlyToml,
  type ServiceConfig
} from '../utils/ruleConverter'

type Props = {
  nodes: Node[]
  edges: Edge[]
}

const defaultConfig: ServiceConfig = {
  name: 'vce-service',
  backends: [
    { name: 'protected_origin', host: 'origin.example.com', useTls: true }
  ],
  defaultBackend: 'protected_origin',
  configStoreName: 'security_rules',
  logEndpoint: 'security_logs'
}

export function DeployPanel({ nodes, edges }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ServiceConfig>(defaultConfig)
  const [stats, setStats] = useState<{
    originalSize: number
    compressedSize: number
    compressionRatio: number
    fitsInConfigStore: boolean
  } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [exportedData, setExportedData] = useState<string | null>(null)

  const handleValidate = useCallback(() => {
    const result = validateGraph(nodes, edges)
    setErrors(result.errors)
    return result.valid
  }, [nodes, edges])

  const handlePack = useCallback(async () => {
    if (!handleValidate()) return

    try {
      const { content, stats: packStats } = await generateCompressedConfigStoreContent(nodes, edges)
      setStats(packStats)
      setExportedData(JSON.stringify(content, null, 2))
    } catch (err) {
      setErrors([`Compression error: ${err instanceof Error ? err.message : 'Unknown error'}`])
    }
  }, [nodes, edges, handleValidate])

  const handleExportConfigStore = useCallback(() => {
    if (!exportedData) return

    const blob = new Blob([exportedData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.configStoreName}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [exportedData, config.configStoreName])

  const handleExportFastlyToml = useCallback(() => {
    const toml = generateFastlyToml(config)
    const blob = new Blob([toml], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fastly.toml'
    a.click()
    URL.revokeObjectURL(url)
  }, [config])

  const updateBackend = useCallback((index: number, field: string, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      backends: prev.backends.map((b, i) =>
        i === index ? { ...b, [field]: value } : b
      )
    }))
  }, [])

  if (!isOpen) {
    return (
      <Button
        variant="primary"
        onClick={() => setIsOpen(true)}
        className="vce-panel-toggle vce-panel-toggle--deploy"
      >
        Deploy
      </Button>
    )
  }

  const usagePercent = stats ? Math.round((stats.compressedSize / 8000) * 100) : 0
  const usageWidth = stats ? Math.min((stats.compressedSize / 8000) * 100, 100) : 0

  return (
    <div className="vce-panel vce-panel--deploy">
      <div className="vce-panel-header">
        <span>Deploy to Fastly</span>
        <button className="vce-panel-close" onClick={() => setIsOpen(false)}>×</button>
      </div>

      <div className="vce-panel-body">
        {/* Service Config */}
        <div className="vce-panel-section">
          <div className="vce-panel-section-title">Service Configuration</div>
          <div className="vce-mb-3">
            <TextInput
              label="Service Name"
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <TextInput
              label="Config Store Name"
              value={config.configStoreName}
              onChange={(e) => setConfig(prev => ({ ...prev, configStoreName: e.target.value }))}
            />
          </div>
        </div>

        {/* Backend Config */}
        <div className="vce-panel-section">
          <div className="vce-panel-section-title">Backend (Protected Origin)</div>
          {config.backends.map((backend, idx) => (
            <div key={idx}>
              <div className="vce-mb-3">
                <TextInput
                  label="Backend Name"
                  value={backend.name}
                  onChange={(e) => updateBackend(idx, 'name', e.target.value)}
                />
              </div>
              <div className="vce-mb-3">
                <TextInput
                  label="Host"
                  value={backend.host}
                  onChange={(e) => updateBackend(idx, 'host', e.target.value)}
                  placeholder="origin.example.com"
                />
              </div>
              <Flex alignItems="center" gap="sm">
                <Switch
                  checked={backend.useTls ?? true}
                  onChange={(checked) => updateBackend(idx, 'useTls', checked)}
                />
                <Text size="sm">Use TLS (HTTPS)</Text>
              </Flex>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="vce-panel-section">
          <Button variant="primary" onClick={handlePack} className="vce-btn-full-width">
            Pack Rules
          </Button>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="vce-panel-section">
            <Alert status="error">
              <p className="vce-panel-error-title">Validation Errors</p>
              {errors.map((err, i) => (
                <p key={i} className="vce-panel-error-item">• {err}</p>
              ))}
            </Alert>
          </div>
        )}

        {/* Compression Stats */}
        {stats && (
          <div className="vce-panel-section">
            <div className="vce-panel-stats">
              <div className="vce-panel-stats-title">Compression Stats</div>

              <div className="vce-panel-stat-row">
                <span className="vce-text-muted vce-text-xs">Original:</span>
                <span className="vce-text-xs">{stats.originalSize.toLocaleString()} bytes</span>
              </div>
              <div className="vce-panel-stat-row">
                <span className="vce-text-muted vce-text-xs">Compressed:</span>
                <span className="vce-text-xs">{stats.compressedSize.toLocaleString()} bytes</span>
              </div>
              <div className="vce-panel-stat-row vce-mb-3">
                <span className="vce-text-muted vce-text-xs">Ratio:</span>
                <Pill status="success" size="sm">{stats.compressionRatio}% smaller</Pill>
              </div>

              {/* Config Store Usage Meter */}
              <div className="vce-mb-3">
                <div className="vce-panel-stat-row vce-mb-1">
                  <span className="vce-text-muted vce-text-xs">Config Store Usage</span>
                  <span className="vce-text-xs">{usagePercent}% of 8KB</span>
                </div>
                <div className="vce-progress-bar">
                  <div
                    className="vce-progress-fill"
                    data-complete={stats.fitsInConfigStore && stats.compressedSize <= 6400}
                    data-warning={stats.fitsInConfigStore && stats.compressedSize > 6400}
                    data-error={!stats.fitsInConfigStore}
                    style={{ width: `${usageWidth}%` }}
                  />
                </div>
                <p className="vce-text-muted vce-text-xs vce-mt-1">
                  {stats.fitsInConfigStore
                    ? stats.compressedSize > 6400
                      ? 'Approaching limit - consider simplifying rules'
                      : 'Plenty of room for more rules'
                    : 'Exceeds 8KB limit - reduce rule complexity'}
                </p>
              </div>

              {stats.fitsInConfigStore && (
                <Flex gap="sm">
                  <Button variant="secondary" size="sm" onClick={handleExportConfigStore}>
                    Export Config Store JSON
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleExportFastlyToml}>
                    Export fastly.toml
                  </Button>
                </Flex>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <Alert status="info">
          <span className="vce-text-xs">
            Rules are compressed using gzip and base64 encoded to maximize storage efficiency.
            Config Store limit: 8,000 characters per value.
          </span>
        </Alert>
      </div>
    </div>
  )
}

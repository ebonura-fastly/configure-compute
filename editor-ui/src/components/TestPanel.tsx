import { useState } from 'react'

type Props = {
  onExecute: (context: object) => unknown
  isLoaded: boolean
}

const defaultRequest = {
  path: '/admin/settings',
  method: 'GET',
  client_ip: '1.2.3.4',
  country: 'DE',
  headers: {},
  user_agent: 'Mozilla/5.0',
}

export function TestPanel({ onExecute, isLoaded }: Props) {
  const [request, setRequest] = useState(JSON.stringify(defaultRequest, null, 2))
  const [result, setResult] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleExecute = () => {
    try {
      const ctx = JSON.parse(request)
      const res = onExecute(ctx)
      setResult(JSON.stringify(res, null, 2))
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} style={toggleStyle}>
        Test Rule
      </button>
    )
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>Test Request</span>
        <button onClick={() => setIsOpen(false)} style={closeStyle}>×</button>
      </div>
      <div style={bodyStyle}>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          style={textareaStyle}
          rows={10}
        />
        <button
          onClick={handleExecute}
          disabled={!isLoaded}
          style={executeStyle}
        >
          {isLoaded ? 'Execute' : 'Loading WASM...'}
        </button>
        {result && (
          <div style={resultStyle}>
            <div style={{ fontWeight: 'bold', marginBottom: 5 }}>Result:</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

const toggleStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: 10,
  padding: '8px 16px',
  background: '#4caf50',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  zIndex: 10,
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: 10,
  width: 350,
  background: '#2a2a40',
  borderRadius: 8,
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  color: 'white',
  zIndex: 10,
}

const headerStyle: React.CSSProperties = {
  padding: '10px 15px',
  borderBottom: '1px solid #444',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontWeight: 'bold',
}

const closeStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  fontSize: 20,
  cursor: 'pointer',
}

const bodyStyle: React.CSSProperties = {
  padding: 15,
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: 8,
  background: '#1a1a2e',
  border: '1px solid #444',
  borderRadius: 4,
  color: 'white',
  fontFamily: 'monospace',
  fontSize: 12,
  resize: 'vertical',
}

const executeStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 10,
  padding: '8px 16px',
  background: '#4caf50',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
}

const resultStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
  background: '#1a1a2e',
  borderRadius: 4,
  fontSize: 12,
  fontFamily: 'monospace',
}

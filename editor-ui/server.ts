import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { compress } from 'hono/compress'

const app = new Hono()

const FASTLY_API_TOKEN = process.env.FASTLY_API_TOKEN ?? ''
const PORT = Number(process.env.PORT) || 8080

// gzip compression
app.use('*', compress())

// Security headers
app.use('*', async (c, next) => {
  await next()
  c.res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
})

// Health check
app.get('/health', (c) => c.text('OK'))

// Fastly API proxy — conditional token injection
// Mirrors vite.config.ts proxy for dev parity
app.all('/fastly-api/*', async (c) => {
  const path = c.req.path.replace(/^\/fastly-api/, '')
  const url = `https://api.fastly.com${path}`

  // Build clean headers — don't forward hop-by-hop or IAP headers
  const headers = new Headers()
  headers.set('Host', 'api.fastly.com')
  const fwdHeaders = ['accept', 'content-type', 'fastly-key']
  for (const key of fwdHeaders) {
    const val = c.req.header(key)
    if (val) headers.set(key, val)
  }
  // Use client's Fastly-Key if present, otherwise inject server-side token
  if (!headers.get('fastly-key') && FASTLY_API_TOKEN) {
    headers.set('Fastly-Key', FASTLY_API_TOKEN)
  }

  const body = ['GET', 'HEAD'].includes(c.req.method)
    ? undefined
    : await c.req.arrayBuffer()

  const resp = await fetch(url, { method: c.req.method, headers, body })
  // Copy into mutable headers so downstream middleware can modify them
  return new Response(resp.body, { status: resp.status, headers: new Headers(resp.headers) })
})

// Edge proxy — CORS bypass for deployment verification
// Mirrors vite.config.ts edgeProxyPlugin for dev parity
app.all('/edge-proxy/:domain{[^/]+}/*', async (c) => {
  const domain = c.req.param('domain')
  const rest = c.req.path.replace(`/edge-proxy/${domain}`, '')
  const url = `https://${domain}${rest}`

  const resp = await fetch(url, {
    method: c.req.method,
    headers: { Host: domain },
    signal: AbortSignal.timeout(10_000),
  })
  return new Response(resp.body, { status: resp.status, headers: new Headers(resp.headers) })
})

// Static files — hashed assets get immutable cache headers
app.use('/assets/*', async (c, next) => {
  await next()
  if (c.res.status === 200) {
    c.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
})
app.use('/assets/*', serveStatic({ root: './dist' }))

// All other static files
app.use('*', serveStatic({ root: './dist' }))

// SPA fallback — serve index.html for client-side routes
app.get('*', serveStatic({ root: './dist', path: '/index.html' }))

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Listening on :${PORT}`)
})

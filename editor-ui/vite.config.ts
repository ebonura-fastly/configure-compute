import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import { execSync } from 'child_process'
import { request as httpsRequest } from 'node:https'

/**
 * Fetch the shared Fastly API token from GCP Secret Manager using local gcloud auth.
 * This mirrors what nginx does in production (envsubst injects the token at startup).
 */
function getSharedToken(): string | null {
  try {
    return execSync(
      'gcloud secrets versions access latest --secret=configure-compute-shared-fastly-token --project=fastly-soc',
      { encoding: 'utf-8', timeout: 10000 }
    ).trim()
  } catch {
    console.warn('[vite] Could not fetch shared Fastly token from Secret Manager. Personal token required.')
    return null
  }
}

/**
 * Vite plugin: reverse-proxy /edge-proxy/<domain>/<path> → https://<domain>/<path>
 * Mirrors the nginx location block so deployment verification avoids CORS.
 */
function edgeProxyPlugin(): Plugin {
  return {
    name: 'edge-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/edge-proxy/')) return next()

        const rest = req.url.slice('/edge-proxy/'.length)
        const slashIdx = rest.indexOf('/')
        if (slashIdx === -1) { res.statusCode = 400; res.end('Bad request'); return }

        const domain = rest.slice(0, slashIdx)
        const path = rest.slice(slashIdx)

        const proxyReq = httpsRequest(
          { hostname: domain, path, method: req.method || 'GET', headers: { ...req.headers, host: domain } },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
            proxyRes.pipe(res)
          },
        )
        proxyReq.on('error', () => { res.statusCode = 502; res.end('Edge proxy error') })
        req.pipe(proxyReq)
      })
    },
  }
}

export default defineConfig(({ command }) => {
  // Only fetch token during dev serve, not during build
  const sharedToken = command === 'serve' ? getSharedToken() : null
  if (sharedToken) console.log('[vite] Shared Fastly token loaded from Secret Manager')

  return {
    plugins: [react(), wasm(), edgeProxyPlugin()],
    // In production builds, the Hono server always has the token from Cloud Run secrets.
    // In dev, it depends on whether gcloud fetched it successfully.
    define: {
      '__SHARED_TOKEN_AVAILABLE__': JSON.stringify(command === 'build' || !!sharedToken),
    },
    server: {
      port: 5174,
      proxy: {
        // Mirror nginx's /fastly-api/ reverse proxy with conditional token injection
        '/fastly-api': {
          target: 'https://api.fastly.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/fastly-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.setHeader('Host', 'api.fastly.com')
              // Mirror nginx map: inject shared token only when client doesn't send one
              if (!req.headers['fastly-key'] && sharedToken) {
                proxyReq.setHeader('Fastly-Key', sharedToken)
              }
            })
          },
        },
      },
    },
    optimizeDeps: {
      exclude: ['cc-core'],
    },
  }
})

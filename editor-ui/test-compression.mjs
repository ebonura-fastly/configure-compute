/**
 * Test script to compare compression strategies for Config Store rules.
 * Run with: node test-compression.mjs
 */

import { Readable } from 'stream'
import { createGzip, createDeflate, createBrotliCompress, constants } from 'zlib'
import { promisify } from 'util'
import { pipeline } from 'stream/promises'

// Sample rules payload - representative of real usage
const sampleRules = {
  v: '1.0',
  r: ['rule_1', 'rule_2', 'rule_3', 'rule_4', 'rule_5'],
  d: {
    rule_1: {
      enabled: true,
      conditions: {
        operator: 'and',
        rules: [
          { type: 'path', operator: 'startswith', value: '/admin' },
          { type: 'ip', operator: 'inrange', value: ['10.0.0.0/8', '192.168.0.0/16'] }
        ]
      },
      action: { type: 'block', response_code: 403, response_message: 'Access denied to admin area' }
    },
    rule_2: {
      enabled: true,
      conditions: {
        operator: 'or',
        rules: [
          { type: 'useragent', operator: 'contains', value: 'bot' },
          { type: 'useragent', operator: 'contains', value: 'crawler' },
          { type: 'useragent', operator: 'contains', value: 'spider' }
        ]
      },
      action: { type: 'challenge', challenge_type: 'javascript' }
    },
    rule_3: {
      enabled: true,
      conditions: {
        operator: 'and',
        rules: [
          { type: 'path', operator: 'startswith', value: '/api' },
          { type: 'ratelimit', window: '60s', max_requests: 100, block_ttl: 300 }
        ]
      },
      action: { type: 'block', response_code: 429, response_message: 'Rate limit exceeded' }
    },
    rule_4: {
      enabled: true,
      conditions: {
        operator: 'and',
        rules: [
          { type: 'header', key: 'X-Forwarded-For', operator: 'exists' },
          { type: 'ip', operator: 'inrange', value: ['1.2.3.0/24'] }
        ]
      },
      action: { type: 'block', response_code: 403, response_message: 'Suspicious proxy detected' }
    },
    rule_5: {
      enabled: false,
      conditions: {
        operator: 'or',
        rules: [
          { type: 'path', operator: 'contains', value: '../' },
          { type: 'path', operator: 'contains', value: '%2e%2e' },
          { type: 'path', operator: 'matches', value: '\\.(php|asp|jsp)$' }
        ]
      },
      action: { type: 'block', response_code: 400, response_message: 'Malicious request detected' }
    }
  }
}

// Create larger test payloads
function createLargePayload(numRules) {
  const payload = { v: '1.0', r: [], d: {} }
  for (let i = 0; i < numRules; i++) {
    const ruleName = `rule_${i}`
    payload.r.push(ruleName)
    payload.d[ruleName] = {
      enabled: true,
      conditions: {
        operator: i % 2 === 0 ? 'and' : 'or',
        rules: [
          { type: 'path', operator: 'startswith', value: `/path${i}` },
          { type: 'ip', operator: 'inrange', value: [`10.${i % 256}.0.0/16`] },
          { type: 'useragent', operator: 'contains', value: `bot${i}` }
        ]
      },
      action: {
        type: i % 3 === 0 ? 'block' : i % 3 === 1 ? 'challenge' : 'allow',
        response_code: 403,
        response_message: `Rule ${i} triggered`
      }
    }
  }
  return payload
}

// Compression functions
async function compressWithStream(data, createCompressor) {
  const chunks = []
  const readable = Readable.from([Buffer.from(data)])
  const compressor = createCompressor()

  return new Promise((resolve, reject) => {
    compressor.on('data', chunk => chunks.push(chunk))
    compressor.on('end', () => resolve(Buffer.concat(chunks)))
    compressor.on('error', reject)
    readable.pipe(compressor)
  })
}

async function compressGzip(data) {
  return compressWithStream(data, () => createGzip({ level: 9 }))
}

async function compressDeflate(data) {
  return compressWithStream(data, () => createDeflate({ level: 9 }))
}

async function compressBrotli(data) {
  return compressWithStream(data, () => createBrotliCompress({
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11  // Max quality
    }
  }))
}

// Minification (remove whitespace, shorten keys)
function minifyJson(obj) {
  // Already using compact keys, just stringify without whitespace
  return JSON.stringify(obj)
}

// More aggressive minification - shorten common strings
function aggressiveMinify(obj) {
  const str = JSON.stringify(obj)
  // Replace common long strings with short tokens
  return str
    .replace(/"operator"/g, '"o"')
    .replace(/"conditions"/g, '"c"')
    .replace(/"enabled"/g, '"e"')
    .replace(/"response_code"/g, '"rc"')
    .replace(/"response_message"/g, '"rm"')
    .replace(/"startswith"/g, '"sw"')
    .replace(/"contains"/g, '"ct"')
    .replace(/"challenge"/g, '"ch"')
    .replace(/"inrange"/g, '"ir"')
}

// MessagePack-like binary encoding (simplified)
function toBinaryFormat(obj) {
  // For this test, we'll just measure JSON as baseline
  // Real implementation would use msgpack or similar
  return JSON.stringify(obj)
}

// Run tests
async function runTests() {
  console.log('=' .repeat(70))
  console.log('COMPRESSION TEST FOR FASTLY CONFIG STORE')
  console.log('Config Store limit: 8,000 characters per value')
  console.log('=' .repeat(70))
  console.log()

  const testCases = [
    { name: '5 rules (typical)', payload: sampleRules },
    { name: '10 rules', payload: createLargePayload(10) },
    { name: '20 rules', payload: createLargePayload(20) },
    { name: '50 rules', payload: createLargePayload(50) },
    { name: '100 rules', payload: createLargePayload(100) },
  ]

  for (const { name, payload } of testCases) {
    console.log(`\n${'─'.repeat(70)}`)
    console.log(`TEST: ${name}`)
    console.log('─'.repeat(70))

    const json = JSON.stringify(payload)
    const minified = minifyJson(payload)
    const aggressive = aggressiveMinify(payload)

    const results = []

    // Raw JSON
    results.push({
      method: 'Raw JSON (pretty)',
      size: JSON.stringify(payload, null, 2).length,
      base64Size: Buffer.from(JSON.stringify(payload, null, 2)).toString('base64').length
    })

    // Minified JSON
    results.push({
      method: 'Minified JSON',
      size: minified.length,
      base64Size: Buffer.from(minified).toString('base64').length
    })

    // Aggressive minification
    results.push({
      method: 'Aggressive minify',
      size: aggressive.length,
      base64Size: Buffer.from(aggressive).toString('base64').length
    })

    // Gzip
    const gzipped = await compressGzip(minified)
    results.push({
      method: 'Gzip (level 9)',
      size: gzipped.length,
      base64Size: gzipped.toString('base64').length
    })

    // Gzip aggressive
    const gzippedAggressive = await compressGzip(aggressive)
    results.push({
      method: 'Gzip + aggressive',
      size: gzippedAggressive.length,
      base64Size: gzippedAggressive.toString('base64').length
    })

    // Deflate
    const deflated = await compressDeflate(minified)
    results.push({
      method: 'Deflate (level 9)',
      size: deflated.length,
      base64Size: deflated.toString('base64').length
    })

    // Brotli
    const brotli = await compressBrotli(minified)
    results.push({
      method: 'Brotli (quality 11)',
      size: brotli.length,
      base64Size: brotli.toString('base64').length
    })

    // Brotli aggressive
    const brotliAggressive = await compressBrotli(aggressive)
    results.push({
      method: 'Brotli + aggressive',
      size: brotliAggressive.length,
      base64Size: brotliAggressive.toString('base64').length
    })

    // Print results table
    console.log()
    console.log('Method                    │ Binary │ Base64  │ Ratio  │ Fits?')
    console.log('──────────────────────────┼────────┼─────────┼────────┼──────')

    const baseline = results[0].base64Size
    for (const r of results) {
      const ratio = ((1 - r.base64Size / baseline) * 100).toFixed(1)
      const fits = r.base64Size <= 8000 ? '✓' : '✗'
      const fitsColor = r.base64Size <= 8000 ? '' : ' (!)'
      console.log(
        `${r.method.padEnd(25)} │ ${String(r.size).padStart(6)} │ ${String(r.base64Size).padStart(7)} │ ${ratio.padStart(5)}% │ ${fits}${fitsColor}`
      )
    }

    console.log()
    console.log(`Best option for Config Store: ${results.reduce((best, r) =>
      r.base64Size < best.base64Size ? r : best
    ).method}`)
  }

  console.log()
  console.log('=' .repeat(70))
  console.log('RECOMMENDATIONS')
  console.log('=' .repeat(70))
  console.log(`
1. For small rule sets (<20 rules): Minified JSON is often enough
2. For medium rule sets (20-50 rules): Gzip provides good balance
3. For large rule sets (50+ rules): Brotli gives best compression
4. Aggressive key shortening adds ~5-10% more savings

Note: Base64 encoding adds ~33% overhead, which is unavoidable for
storing binary data in Config Store's string values.

Browser support:
- Gzip: CompressionStream API (Chrome 80+, Firefox 113+, Safari 16.4+)
- Brotli: NOT supported in browser CompressionStream
- Deflate: CompressionStream API supports 'deflate' and 'deflate-raw'

Recommendation: Use Gzip for browser compatibility, or Brotli if
compressing server-side before upload.
`)
}

runTests().catch(console.error)

/**
 * Generates a gzip+base64 compressed test payload that can be used
 * to test the Rust decompression in compute/src/rules/loader.rs
 *
 * Run: node generate-test-payload.mjs
 */

import { createGzip } from 'zlib'
import { Readable } from 'stream'

const testPayload = {
  v: '1.0',
  r: ['rule_admin_block', 'rule_bot_challenge'],
  d: {
    rule_admin_block: {
      enabled: true,
      conditions: {
        operator: 'and',
        rules: [
          { type: 'path', operator: 'startswith', value: '/admin' },
          { type: 'ip', operator: 'inrange', value: ['10.0.0.0/8'] }
        ]
      },
      action: { type: 'block', response_code: 403, response_message: 'Access denied' }
    },
    rule_bot_challenge: {
      enabled: true,
      conditions: {
        operator: 'or',
        rules: [
          { type: 'useragent', operator: 'contains', value: 'bot' }
        ]
      },
      action: { type: 'challenge', challenge_type: 'javascript' }
    }
  }
}

async function compress(data) {
  const chunks = []
  const readable = Readable.from([Buffer.from(data)])
  const gzip = createGzip({ level: 9 })

  return new Promise((resolve, reject) => {
    gzip.on('data', chunk => chunks.push(chunk))
    gzip.on('end', () => resolve(Buffer.concat(chunks)))
    gzip.on('error', reject)
    readable.pipe(gzip)
  })
}

async function main() {
  const json = JSON.stringify(testPayload)
  const compressed = await compress(json)
  const base64 = compressed.toString('base64')

  console.log('// Generated test payload for Rust integration test')
  console.log('// Original JSON size:', json.length, 'bytes')
  console.log('// Compressed size:', compressed.length, 'bytes')
  console.log('// Base64 size:', base64.length, 'bytes')
  console.log()
  console.log('const TEST_PAYLOAD: &str = "' + base64 + '";')
  console.log()
  console.log('// Expected after decompression:')
  console.log('// rule_list: ["rule_admin_block", "rule_bot_challenge"]')
  console.log('// rules count: 2')
}

main()

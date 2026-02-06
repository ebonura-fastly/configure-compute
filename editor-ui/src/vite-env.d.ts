/// <reference types="vite/client" />

// Set by vite.config.ts: whether the shared Fastly token was loaded from GCP Secret Manager
declare const __SHARED_TOKEN_AVAILABLE__: boolean

// Allow importing .b64 files as raw strings
declare module '*.b64?raw' {
  const content: string
  export default content
}

/// <reference types="vite/client" />

// Allow importing .b64 files as raw strings
declare module '*.b64?raw' {
  const content: string
  export default content
}

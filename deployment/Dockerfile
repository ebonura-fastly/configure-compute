# Multi-stage build for Configure Compute editor-ui
# Stage 1: Build cc-core WASM
# Stage 2: Build editor-ui + Hono server
# Stage 3: Serve with Node.js + Hono

# ============================================================================
# Stage 1: Build cc-core WASM with Rust + wasm-pack
# ============================================================================
FROM rust:1.83-slim AS wasm-builder

# Install wasm-pack and build dependencies
RUN apt-get update && apt-get install -y \
    curl \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/* \
    && curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /build

# Copy core source
COPY core/ ./core/

# Build cc-core WASM package
WORKDIR /build/core
RUN wasm-pack build --target web --out-dir pkg

# ============================================================================
# Stage 2: Build editor-ui with Node.js
# ============================================================================
FROM node:22-slim AS ui-builder

ARG GITHUB_TOKEN

WORKDIR /build

# Copy package files and .npmrc for private @fastly packages
COPY editor-ui/package*.json editor-ui/.npmrc ./editor-ui/

# Copy the built WASM package from stage 1
COPY --from=wasm-builder /build/core/pkg ./core/pkg/

# Install dependencies (token used via .npmrc, then removed)
WORKDIR /build/editor-ui
RUN FASTLY_PACKAGES_GITHUB_TOKEN=${GITHUB_TOKEN} npm ci --legacy-peer-deps && rm -f .npmrc

# Copy editor-ui source
COPY editor-ui/ ./

# Build the production bundle
RUN npm run build

# Bundle the Hono server into a single file (esbuild inlines all deps)
RUN npx esbuild server.ts --bundle --platform=node --format=esm --outfile=server.js

# ============================================================================
# Stage 3: Production image with Node.js + Hono
# ============================================================================
FROM node:22-alpine AS production

WORKDIR /app

# Copy the bundled server and built static files
COPY --from=ui-builder /build/editor-ui/server.js ./server.js
COPY --from=ui-builder /build/editor-ui/dist ./dist

# Cloud Run uses port 8080
EXPOSE 8080

CMD ["node", "server.js"]

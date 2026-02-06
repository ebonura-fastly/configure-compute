# Multi-stage build for Configure Compute editor-ui
# Stage 1: Build cc-core WASM
# Stage 2: Build editor-ui
# Stage 3: Serve with nginx

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

# ============================================================================
# Stage 3: Production image with nginx
# ============================================================================
FROM nginx:alpine AS production

# Copy custom nginx config
COPY deployment/nginx.conf /etc/nginx/nginx.conf

# Copy built static files
COPY --from=ui-builder /build/editor-ui/dist /usr/share/nginx/html

# Cloud Run uses port 8080
EXPOSE 8080

# nginx runs as non-root by default in alpine
CMD ["nginx", "-g", "daemon off;"]

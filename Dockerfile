# ─────────────────────────────────────────────────────────────
#  Stage 1 — Build the Vite React frontend
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (layer cache optimisation)
COPY package*.json ./

# Install ALL deps (including devDeps needed for Vite build)
RUN npm ci

# Copy source
COPY . .

# Build Vite → dist/
RUN npm run build

# ─────────────────────────────────────────────────────────────
#  Stage 2 — Production runtime (Express server)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Only install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server-side source files
COPY server.js ./
COPY services/ ./services/

# Copy seed data (db.json) — will be overwritten by mounted volume in production
COPY data/ ./data/

# Ensure the uploads temp directory exists
RUN mkdir -p uploads

# Expose the Express server port
EXPOSE 5000

# Health-check so Docker/compose knows when the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/state || exit 1

# Start the Express server (serves dist/ as static + /api/* routes)
CMD ["node", "server.js"]

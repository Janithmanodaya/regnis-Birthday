# ─────────────────────────────────────────────────────────────
#  Stage 1 — Build the Vite React frontend
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package.json — NOT package-lock.json.
# The lock file contains an empty-version entry from the xlsx package
# which causes npm to throw "Invalid Version:" before installing anything.
# A fresh npm install resolves all versions correctly from the registry.
COPY package.json ./

RUN npm install

# Copy all source files
COPY . .

# Build Vite → dist/
RUN npm run build

# ─────────────────────────────────────────────────────────────
#  Stage 2 — Production runtime (Express server only)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only package.json for a clean production install
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled Vite frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server-side source files
COPY server.js ./
COPY services/ ./services/

# Copy seed data (db.json) — overwritten by named volume in production
COPY data/ ./data/

# Ensure uploads temp directory exists
RUN mkdir -p uploads

# Expose Express server port
EXPOSE 5000

# Health-check: container is ready when /api/state responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/state || exit 1

# Start the Express server (serves dist/ as static + /api/* routes)
CMD ["node", "server.js"]

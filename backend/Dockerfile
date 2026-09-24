# Multi-stage Dockerfile for Spotwork Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build
COPY src ./src
RUN npm run build

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

# Security: non-root user
USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]

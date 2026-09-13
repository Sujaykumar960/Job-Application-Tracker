# ==============================================================================
# CareerX Frontend - Production Dockerfile (React 18 + Vite + Nginx)
# ==============================================================================

# Stage 1: Build the static bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with frozen lockfile
COPY package*.json ./
RUN npm ci

# Copy source code and build production distribution
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Serve static bundle via Alpine Nginx
FROM nginx:1.27-alpine AS runner

# Remove default nginx boilerplate
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA bundle
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

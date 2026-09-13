# CareerX — Production Deployment & Infrastructure Runbook

## Overview
CareerX is an enterprise-grade AI career platform. This runbook details the end-to-end procedures for provisioning, deploying, securing, and maintaining CareerX in a production environment using Docker Compose or containerized infrastructure.

---

## Architecture Overview

```
                          [ HTTPS / Port 443 ]
                                   │
                                   ▼
                         [ Nginx Ingress / CDN ]
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   [ Nginx Frontend Container ]             [ FastAPI Backend API ]
   - Serves React 18 SPA Bundle             - Python 3.12 (4 Uvicorn Workers)
   - Handles Gzip & Asset Caching           - JWT Authentication & RBAC
   - Reverse Proxies /api and /api/ws       - Structured JSON Logging
              │                                         │
              │                                         ▼
              └───────────────────────────────► [ MongoDB 7.0 Cluster ]
                                                - Named Volume Persistence
                                                - Automated Compound Indexing
```

---

## Prerequisites

- **Host Requirements**:
  - Minimum 2 vCPUs, 4 GB RAM (8 GB recommended for production scale).
  - Ubuntu 22.04 LTS or higher (or equivalent Linux distribution).
  - Docker Engine 24.0+ and Docker Compose v2.20+.
- **Domain & Networking**:
  - Fully qualified domain name (FQDN) configured with DNS A-records pointing to host IP.
  - Inbound ports `80` (HTTP) and `443` (HTTPS) open.

---

## Step-by-Step Deployment Instructions

### 1. Clone Repository & Setup Working Directory
```bash
git clone https://github.com/your-org/careerx.git /opt/careerx
cd /opt/careerx
```

### 2. Configure Production Secrets
Copy the environment template and generate cryptographically secure keys:
```bash
cp .env.production.example .env.production
```

Generate a secure 64-character JWT secret key:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Edit `.env.production` and configure:
- `JWT_SECRET_KEY`: (Paste generated token)
- `CORS_ORIGINS`: `https://careerx.yourdomain.com`
- `MONGODB_URI`: `mongodb://mongodb:27017`
- `GROQ_API_KEY`: (Optional API key for Groq AI ATS resume analyzer)

### 3. Build & Launch Containers
```bash
# Build multi-stage images
docker compose --env-file .env.production build

# Start containers in detached mode
docker compose --env-file .env.production up -d
```

### 4. Verify Service Health
```bash
# Check container status
docker compose ps

# Test backend health check
curl -f http://localhost/api/health

# Test deep readiness probe
curl -f http://localhost/api/health/ready

# Test Prometheus metrics
curl -s http://localhost/metrics | head -n 15
```

---

## SSL/TLS Configuration with Let's Encrypt (Certbot)

To secure the deployment with automated SSL renewal:

1. Install Certbot on the host:
   ```bash
   sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx
   ```
2. Obtain certificate:
   ```bash
   sudo certbot --nginx -d careerx.yourdomain.com
   ```
3. Verify automatic renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

---

## Database Management & Backup Strategy

### Automated Nightly Backup Script (`/opt/careerx/backup.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/careerx"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker exec careerx-mongodb mongodump --out="/data/db/backup_$DATE"
docker cp "careerx-mongodb:/data/db/backup_$DATE" "$BACKUP_DIR/"
docker exec careerx-mongodb rm -rf "/data/db/backup_$DATE"

# Keep last 14 days of backups
find "$BACKUP_DIR" -type d -mtime +14 -exec rm -rf {} +
echo "[$(date)] CareerX MongoDB backup completed: backup_$DATE"
```

### Restore Database
```bash
docker cp /var/backups/careerx/backup_YYYYMMDD_HHMMSS careerx-mongodb:/tmp/restore
docker exec careerx-mongodb mongorestore /tmp/restore
docker exec careerx-mongodb rm -rf /tmp/restore
```

---

## Observability & Monitoring

1. **Prometheus Metrics**:
   - Endpoint: `https://careerx.yourdomain.com/metrics`
   - Scrape Interval: 15s
   - Key Alerting Rules:
     - `careerx_database_connected == 0` (Severity: Critical)
     - `rate(careerx_http_requests_total{status=~"5.."}[5m]) > 0.05` (Severity: Warning)
2. **Structured JSON Logs**:
   - Logs are formatted in JSON with `request_id`, `duration_ms`, and `status_code`.
   - Ingest into Loki, Datadog, or Elasticsearch:
     ```bash
     docker logs -f careerx-backend
     ```

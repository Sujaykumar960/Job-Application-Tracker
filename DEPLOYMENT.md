# CareerX — Production Deployment & Infrastructure Runbook

## Overview
CareerX is an enterprise AI job tracking and interview preparation platform. This runbook details the procedures for deploying CareerX in a production environment using a decoupled cloud topology:
- **Frontend SPA**: Hosted on Vercel Edge Network
- **Backend API & Sandbox**: Hosted on an isolated Linux Docker Host (Ubuntu 22.04/24.04 LTS)
- **Database**: Managed MongoDB Atlas Cluster
- **Cache & Rate Limiting**: Redis
- **AI Engine**: Groq Cloud (Llama 3.3 70B)

---

## 1. Architecture Topology

```
                       ┌──────────────────────────────┐
                       │          End Users           │
                       └──────────────┬───────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │ HTTPS (Port 443)                                  │ API Requests & WebSockets
            ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│      Vercel Edge Network      │               │      Linux Docker Server      │
│   (React SPA + Vite Bundle)   │               │   (Ubuntu 22.04 / 24.04 LTS)  │
│                               │               │                               │
│  Domain: app.yourdomain.com   │               │  Domain: api.yourdomain.com   │
│  or careerx.vercel.app        │               │                               │
└───────────────────────────────┘               │   ┌───────────────────────┐   │
                                                │   │      Nginx Edge       │   │
                                                │   │     (Port 80/443)     │   │
                                                │   └───────────┬───────────┘   │
                                                │               │               │
                                                │   ┌───────────▼───────────┐   │
                                                │   │     FastAPI Core      │   │
                                                │   │     (Port 8000)       │   │
                                                │   └───┬───────┬───────┬───┘   │
                                                └───────┼───────┼───────┼───────┘
                                                        │       │       │
                                     Unix Socket (0660) │       │       │ Internal Bridge
                                                        ▼       │       ▼
                                ┌───────────────────────────┐   │   ┌───────────────────┐
                                │   careerx-code-sandbox    │   │   │   careerx-redis   │
                                │   network_mode: "none"    │   │   │   (Rate Limiter)  │
                                │   (Zero-Network Airgap)   │   │   └───────────────────┘
                                └───────────────────────────┘   │
                                                                │ External Egress (TLS)
                                ┌───────────────────────────────┼───────────────────────┐
                                │                               │                       │
                                ▼                               ▼                       ▼
                ┌───────────────────────────────┐   ┌───────────────────────┐
                │         MongoDB Atlas         │   │       Groq Cloud      │
                │    (Multi-node Replica Set)   │   │    (Llama 3.3 70B)    │
                └───────────────────────────────┘   └───────────────────────┘
```

---

## 2. Prerequisites

### Host Server Specifications
- **Operating System**: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS x86_64
- **Compute**: Minimum 2 vCPUs, 4 GB RAM (8 GB recommended for heavy concurrent workloads)
- **Disk**: 25+ GB NVMe / SSD
- **Runtime**: Docker Engine 24.0+ & Docker Compose Plugin (v2.20+)

### Managed Services & Cloud Accounts
- **MongoDB Atlas**: M0 Free Tier or M10+ Dedicated cluster (database user created with `readWrite` permissions).
- **Groq Cloud API Key**: Active key (`gsk_...`) for AI ATS resume analysis.
- **Vercel Account**: For deploying the frontend React application.
- **DNS / Domain**: Domain name with access to configure `A` and `CNAME` records.

---

## 3. Environment Variables

Production environment variables must be stored strictly in `/opt/careerx/.env` with `600` permissions on the host. **Never commit `.env` or production credentials to Git.**

| Variable Name | Required | Description | Example / Placeholder |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Yes | Runtime environment flag | `production` |
| `APP_NAME` | Yes | Application identifier | `CareerX Production API` |
| `PORT` | Yes | Ingress HTTP port | `80` |
| `JWT_SECRET_KEY` | **Yes** | 256-bit cryptographically secure token | `<64_HEX_CHARACTERS>` |
| `JWT_ALGORITHM` | Yes | Token signature algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | JWT session expiration (minutes) | `1440` (24 hours) |
| `MONGODB_URI` | **Yes** | MongoDB Atlas SRV connection string | `mongodb+srv://<USER>:<PASS>@<HOST>/...` |
| `MONGODB_DB_NAME` | Yes | Target database name | `careerx_prod_db` |
| `REDIS_URL` | **Yes** | Redis connection URI for rate limiting | `redis://redis:6379/0` |
| `GROQ_API_KEY` | Yes | Groq AI LLM inference API key | `gsk_...` |
| `GROQ_MODEL` | Yes | AI model name | `llama-3.3-70b-versatile` |
| `CORS_ORIGINS` | Yes | Allowed frontend origins (comma-separated)| `https://app.yourdomain.com,https://careerx.vercel.app` |
| `UPLOAD_DIR` | Yes | Internal path for uploaded files | `/app/uploads` |
| `STORAGE_BACKEND` | Yes | File storage provider | `local` |
| `CODE_SANDBOX_URL` | Yes | IPC connection to code execution sandbox | `unix:///sandbox_ipc/sandbox.sock` |
| `CODE_SANDBOX_TIMEOUT_SECONDS` | Yes | Execution timeout per test case | `5.0` |

---

## 4. Production Backend & Sandbox Deployment

### Step 1 — Connect to Ubuntu VPS & Install Docker
```bash
ssh root@<YOUR_VPS_IP>

# Install Docker Engine & Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2 — Clone Repository
```bash
git clone https://github.com/Sujaykumar960/Job-Application-Tracker.git /opt/careerx
cd /opt/careerx
```

### Step 3 — Generate Production Secrets & Configure `.env`
Generate a fresh 64-character hex secret:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Create `.env` from template and restrict permissions:
```bash
cp .env.production.example .env
chmod 600 .env
nano .env
```
Populate `JWT_SECRET_KEY`, `MONGODB_URI`, `REDIS_URL`, `GROQ_API_KEY`, and `CORS_ORIGINS`.

### Step 4 — Start Containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

---

## 5. Health & Sandbox Verification

### 5.1 API Gateway Health Verification
```bash
curl -i http://localhost/api/health
```
**Expected Output:**
```json
HTTP/1.1 200 OK
{"status":"healthy","database":"connected","redis":"connected"}
```

### 5.2 Sandbox Zero-Network Interface Verification
```bash
docker compose -f docker-compose.prod.yml exec code-sandbox ip addr
```
**Expected:** Only loopback `lo` is present. No `eth0` interface, no IP address assigned.

### 5.3 Sandbox Routing Table Absence
```bash
docker compose -f docker-compose.prod.yml exec code-sandbox ip route
```
**Expected:** Completely empty output (0 routes, exit code 0).

### 5.4 Unix Socket Least-Privilege Permissions
```bash
docker compose -f docker-compose.prod.yml exec backend ls -la /sandbox_ipc/sandbox.sock
```
**Expected:** `srw-rw---- 1 careerx careerx ... /sandbox_ipc/sandbox.sock` (mode `0660`, GID 1001, not world-writable).

### 5.5 Normal Isolated Python Code Execution
```bash
curl -i -X POST http://localhost/api/code/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"def solve(x): return x * 2","testCases":[{"id":"tc1","input":"21","expectedOutput":"42"}]}'
```
**Expected:** `HTTP 200 OK`, `"status": "Accepted"`, `"passedCount": 1`.

### 5.6 Sandbox Hard Outage Fail-Closed Test (CRITICAL)
```bash
docker compose -f docker-compose.prod.yml stop code-sandbox
curl -i -X POST http://localhost/api/code/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"def solve(): return 42"}'
```
**Expected:** `HTTP 503 Service Unavailable`, `"message": "Secure code sandbox service is unreachable..."`. Subprocess runner on host must NEVER execute.

### 5.7 Sandbox Recovery Test
```bash
docker compose -f docker-compose.prod.yml start code-sandbox
curl -i -X POST http://localhost/api/code/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"def solve(): return 42"}'
```
**Expected:** `HTTP 200 OK`, execution restored.

### 5.8 Adversarial Lateral Movement Network Test
```bash
curl -i -X POST http://localhost/api/code/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"def solution():\n  import urllib.request\n  return urllib.request.urlopen(\"http://mongodb:27017\", timeout=1).read().decode()"}'
```
**Expected:** `passed: false`, `"URLError: <urlopen error Network socket creation is disabled inside this sandbox environment.>"`.

---

## 6. Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com/new) and click **Import Project** → Select `Job-Application-Tracker`.
2. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Configure Environment Variables in Vercel:
   - `VITE_API_BASE_URL`: `https://api.yourdomain.com/api`
   - *(Optional WebSocket override)* `VITE_WS_BASE_URL`: `wss://api.yourdomain.com/api/ws/chat`

> **Required:** `VITE_API_BASE_URL` is enforced at build time. A production
> `npm run build` aborts with a clear error if it is unset or does not end in
> `/api`, so a misconfigured deploy cannot silently ship pointing at
> `localhost`. For `Dockerfile`-based builds, pass it as a build arg:
> `docker build --build-arg VITE_API_BASE_URL=https://api.yourdomain.com/api .`

4. Click **Deploy**.

---

## 7. DNS & SSL / HTTPS Setup

### 7.1 DNS Records (at your DNS Registrar or Cloudflare)

| Type | Host / Name | Target / Value | Purpose |
| :--- | :--- | :--- | :--- |
| `CNAME` | `app` (or `@`) | `cname.vercel-dns.com` | Routes frontend to Vercel CDN |
| `A` | `api` | `<YOUR_LINUX_VPS_IP>` | Routes API calls to Linux Server |

### 7.2 SSL Termination on Linux VPS (Let's Encrypt / Certbot)
```bash
# 1. Install Certbot
sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx

# 2. Issue certificate
sudo certbot certonly --standalone -d api.yourdomain.com

# 3. Mount certificate and use SSL Nginx template:
cp nginx.ssl.conf.example nginx.ssl.conf
```
Edit `docker-compose.prod.yml` to mount certificates:
```yaml
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./nginx.ssl.conf:/etc/nginx/conf.d/default.conf:ro
```
Restart Nginx:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 8. Rollback Procedures

### Rollback Container Stack
To stop and revert to a previous commit on the Linux server:
```bash
cd /opt/careerx
docker compose -f docker-compose.prod.yml down
git checkout <PREVIOUS_STABLE_COMMIT_SHA>
docker compose -f docker-compose.prod.yml up -d --build
```

### Rollback Vercel Frontend
1. Open the **Deployments** tab in your Vercel Project Dashboard.
2. Locate the previous stable deployment.
3. Click the three dots `...` and select **Promote to Production**. Instant rollback takes effect within seconds without rebuild.

### Emergency Stack Stop
```bash
cd /opt/careerx
docker compose -f docker-compose.prod.yml down -v
```
*(Named volumes `careerx_prod_redis_data` and `careerx_prod_backend_uploads` are preserved unless `--volumes` is explicitly purged).*

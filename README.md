# CareerX — Enterprise AI Career & Talent Platform

[![Live Deployment](https://img.shields.io/badge/Live%20Demo-Vercel%20Production-success?style=for-the-badge&logo=vercel&logoColor=white)](https://job-application-tracker-qnifqagyn-sujays-projects-1cf97f4a.vercel.app)
[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![Pytest Suites](https://img.shields.io/badge/Pytest-397%20Passed-blue?style=for-the-badge&logo=pytest&logoColor=white)](backend/tests/)
[![E2E Coverage](https://img.shields.io/badge/Playwright-34%2F34%20E2E-success?style=for-the-badge&logo=playwright&logoColor=white)](tests/e2e/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.12-009688?style=for-the-badge&logo=fastapi&logoColor=white)](backend/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)](src/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%207.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)]()

---

## 🌐 Live Production Deployment

Access the live platform in your browser:

🔗 **[https://job-application-tracker-qnifqagyn-sujays-projects-1cf97f4a.vercel.app](https://job-application-tracker-qnifqagyn-sujays-projects-1cf97f4a.vercel.app)**

> **Pre-configured Demo Accounts:**
> - **Job Seeker**: `alex.rivera@devmail.io` / `Password123!` (or register any new account)
> - **Technical Recruiter**: `sarah.lin@stripe.com` / `Password123!`
> - **Platform Admin**: `admin@careerx.io` / `Password123!`

---

## 📖 Executive Overview

**CareerX** is an enterprise-grade AI-powered career acceleration and applicant tracking platform. It bridges the gap between software engineers navigating the competitive recruitment lifecycle and technical talent teams managing hiring pipelines. 

Designed with a **laptop-first, high-density responsive UI** (optimized for 1366×768, 1440×900, and 1536×864 resolutions with a 1400px constraint) and full **Dark / Light mode** support, CareerX unites:
1. **Interactive Job & Internship Application Pipeline** with drag-and-drop Kanban, live conversion analytics, recruiter notes, and multi-parameter filtering.
2. **AI Resume Diagnostics & ATS Scorer** featuring 4-pillar compatibility analysis, STAR bullet enhancement, and keyword extraction.
3. **Skill-Gap Analysis & Learning Roadmaps** with radar charts linking missing competencies directly to interactive practice modules.
4. **Developer Learning Hub & In-Browser Monaco IDE Sandbox** with isolated multi-language code execution.
5. **Talent Discovery & Recruiter Management Portal** for posting openings, candidate dossier review, and interview stage management.
6. **Real-Time Professional Network & Direct Messaging** supporting peer connections, real-time presence, and community technical discussions.
7. **Schedule & Milestone Calendar** tracking upcoming technical interviews, OA deadlines, and offer decision dates.

---

## 🏗️ System Architecture & Data Flow

```
                                      [ HTTPS Ingress ]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [ Vercel Edge / CDN ]                           [ Nginx Reverse Proxy ]
     https://job-application-tracker-*.vercel.app               Port 80 / 443
                      │                                               │
                      ▼                                               ▼
         [ React 18 SPA Frontend ]                       [ FastAPI Application Service ]
         - Vite 6 + TypeScript                           - Python 3.12 / Uvicorn ASGI
         - Tailwind CSS + Lucide                         - JWT Bearer Authentication & Blacklist
         - Monaco Code Editor Sandbox                    - Multi-Tenant RBAC Security Middleware
         - Recharts Analytics (Radar/Funnel)             - Sandbox Resource Guardrails (RLIMIT_AS/CPU)
         - WebSocket Real-time Client                    - Prometheus Metrics (/metrics)
                      │                                               │
                      │               REST / WebSocket API            │
                      └──────────────────────────────────────────────►│
                                                                      ▼
                                                          [ MongoDB 7.0 Document DB ]
                                                          - Compound & Full-Text Search Indexes
                                                          - Multi-Tenant Isolated Collections
                                                          - Motor AsyncIO Non-Blocking Driver
```

---

## 🚀 Key Modules & Capabilities

### 1. Job Application Pipeline Tracker (Release 1 & Release 2)
- **Multi-View Interface**: High-density tabular view and responsive Kanban cards organized by status.
- **Stage Progression**: Full tracking across stages: `Applied`, `Interview`, `Offer`, `Rejected`, `Wishlist`, and `Accepted`.
- **JA-05 Application Notes (Release 2)**:
  - Add recruiter names, feedback, compensation details, and interview takeaways to any application.
  - Dedicated notes section on the Application Detail modal with add, view, and deletion capabilities.
  - Synchronized via REST API endpoints (`POST/GET/DELETE /api/applications/{id}/notes`).
- **JA-06 Multi-Status Filtering & Keyword Search (Release 2)**:
  - Filter applications dynamically by status (`All`, `Applied`, `Interview`, `Offer`, `Rejected`).
  - Search applications in real-time across company name, role, recruiter, notes, and tags.
  - Case-insensitive normalized backend status filtering supporting both singular and plural aliases.
- **JA-08 KPI Analytics Dashboard (Release 2)**:
  - Live metric cards: Total Applications, Applied, Interviews in Progress, Offers Received, and Rejection Rate.
  - Quick-link cards redirecting directly to status-filtered application views.
  - Backend aggregation endpoints (`GET /api/dashboard` and `GET /api/dashboard/stats`).
- **Deadline & Interview Tracking**:
  - Urgent countdown badges (`Due Today`, `Overdue`, `X days left`).
  - Priority levels (`High`, `Medium`, `Low`) with color-coded badges.

### 2. AI Resume Diagnostics & ATS Scoring Engine
- **Multi-Format Upload**: Supports real `.pdf` and `.docx` file uploads with magic byte MIME inspection, sanitization, and size validation.
- **4-Pillar Diagnostic Analysis**:
  1. *Keywords & Technical Skills*: Density and relevance against target market roles.
  2. *Quantified Metrics & Impact*: Evaluates action-driven, measurable STAR-format achievements.
  3. *ATS Readability & Formatting*: Validates standard font structures, clean headings, and parser-friendly layouts.
  4. *Section Completeness*: Checks for Summary, Experience, Education, Projects, and Certifications.
- **Dynamic ATS Gauge**: Circular gauge displaying verified ATS score (starts cleanly at 0% until a user uploads and analyzes a resume).
- **STAR Bullet Rewriter**: AI-assisted bullet point optimizer converting passive descriptions into high-impact impact statements.

### 3. Professional Network & Peer Discovery
- **Peer Directory**: Discover candidates, software engineers, and hiring managers with real profile cards.
- **Auto-Sync on Login & Registration**: Newly registered or newly logged-in candidates are automatically synchronized and sorted by recency (`updatedAt`), ensuring immediate visibility across the network.
- **Dynamic Relationship Management**:
  - Send, cancel, accept, and reject connection requests.
  - Visual relationship states: `Connect`, `Pending`, `Connected`, and `Following`.
  - Genuine mutual connections counter calculated via graph intersection.

### 4. Developer Learning Hub & In-Browser Monaco IDE Sandbox
- **Embedded Monaco Editor**: Full VS Code-style editor powered by `@monaco-editor/react` supporting Python 3, TypeScript, JavaScript, Go, and Java.
- **Curated Problem Bank**: Algorithmic and data structures problems filterable by difficulty (`Easy`, `Medium`, `Hard`), topic (DP, Graphs, Trees, Arrays), and target tech companies.
- **Sandboxed Execution**: Backend code execution engine with strict resource bounds (`RLIMIT_AS`, `RLIMIT_CPU`), timeout execution guards, and host isolation.
- **Distributed Systems Case Studies**: Architectural modules covering Rate Limiting, Cache Stampede mitigation, Kafka Outbox patterns, and Database Indexing tradeoffs.

### 5. Skill Gap Matrix & Career Roadmaps
- **Competency Heatmap & Radar**: Compares user profile skills against targeted software tracks (`Backend Systems`, `Full Stack`, `Distributed Systems`).
- **Direct Practice Bridges**: Flags identified skill gaps and directly links to CareerX coding problems and architectural case studies.

### 6. Recruiter Portal & Talent Sourcing (`role="recruiter"`)
- **Job Creation & Posting**: Publish openings with compensation ranges, employment types, experience levels, and required skill tags.
- **Applicant Pipeline Management**: Review candidate rosters per job listing with ATS compatibility ranking and one-click candidate dossier modals.
- **Tenant Isolation**: Strict company-scoped authorization preventing recruiters from viewing or editing listings outside their verified organization.

### 7. Real-Time Chat & Communications
- **Direct Messaging**: 1-on-1 private messaging via WebSockets (`/api/ws/chat`) with automatic connection fallback and read states.
- **Community Feed**: Technical discussions, announcements, and engineering posts with media attachments and interaction counters.

### 8. Platform Governance & Administration (`role="admin"`)
- **KPI Monitoring**: Platform-wide metrics on user registrations, job postings, application throughput, and system health.
- **User Governance**: Searchable user directory with role modification (`seeker`, `recruiter`, `admin`) and account status toggles.
- **Audit Logs**: Immutable security audit trail recording administrative actions, resource IDs, and timestamps.

---

## 🛠️ Complete Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, Vite 6, TypeScript 5.8 |
| **Styling & Theme** | Tailwind CSS 3.4, PostCSS, Lucide React Icons, Dark/Light Mode Theme Context |
| **Data Visualization** | Recharts (PolarRadarChart, ResponsiveContainer, BarChart, Funnel) |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Backend Framework** | FastAPI 0.115+, Python 3.12/3.14, Uvicorn (ASGI), Pydantic v2 |
| **Database & ODM** | MongoDB 7.0, Motor (AsyncIO Driver), PyMongo 4.9+ |
| **Authentication & AuthZ** | JWT (`HS256`), Bcrypt (12 work factor), Database Token Revocation Blacklist, Role-Based Access Control |
| **Static & Reverse Proxy** | Nginx Alpine, Vercel Edge Network |
| **Observability** | Prometheus Telemetry (`/metrics`), Deep Health Probes (`/api/health/ready`), Structured JSON logs |
| **Test Automation** | Pytest 9, Pytest-AsyncIO, Starlette TestClient, Playwright (Chromium E2E) |

---

## 🔌 API Architecture & Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Authentication** | `POST` | `/api/auth/register` | Register new user (`seeker` or `recruiter`) |
| | `POST` | `/api/auth/login` | Authenticate user, issue JWT, and sync profile |
| | `POST` | `/api/auth/refresh` | Exchange valid refresh token for access token |
| | `POST` | `/api/auth/logout` | Revoke active JWT and invalidate session |
| **Applications** | `GET` | `/api/applications` | List applications with status, priority, and search filters |
| | `POST` | `/api/applications` | Create new tracked application |
| | `GET` | `/api/applications/{id}` | Retrieve application details (with IDOR ownership checks) |
| | `PATCH` | `/api/applications/{id}` | Update application status, deadline, or metadata |
| | `DELETE` | `/api/applications/{id}` | Delete application record |
| | `POST` | `/api/applications/{id}/notes` | Add note to application (**JA-05**) |
| | `GET` | `/api/applications/{id}/notes` | List notes for application (**JA-05**) |
| | `DELETE` | `/api/applications/{id}/notes/{note_id}` | Delete application note (**JA-05**) |
| **Dashboard** | `GET` | `/api/dashboard` | Application counts and status distribution (**JA-08**) |
| | `GET` | `/api/dashboard/stats` | Live KPI metrics and conversion velocity |
| | `GET` | `/api/dashboard/overview` | Aggregated user overview metrics |
| **Resumes & AI** | `POST` | `/api/resumes/upload` | Multipart upload for `.pdf` and `.docx` |
| | `POST` | `/api/resumes/{id}/analyze` | Trigger 4-pillar ATS diagnostic analysis |
| | `POST` | `/api/ai/optimize-bullet` | AI STAR-method bullet optimization |
| **Network** | `GET` | `/api/network/discover` | Discover candidates and recruiters (auto-synced) |
| | `GET` | `/api/network/suggestions` | Peer recommendations based on skill affinity |
| | `POST` | `/api/network/requests` | Send connection request |
| | `POST` | `/api/network/requests/{id}/accept` | Accept incoming connection request |
| | `POST` | `/api/network/requests/{id}/reject` | Reject incoming connection request |
| **Sandbox** | `POST` | `/api/code/run` | Execute code in isolated sandbox worker |
| **Jobs** | `GET` | `/api/jobs` | Browse active job listings with filters |
| | `POST` | `/api/jobs` | Post new job opening (Recruiter only) |
| **Health** | `GET` | `/api/health` | Service liveness probe |
| | `GET` | `/api/health/ready` | Deep database connectivity and readiness check |

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: v20 LTS or later
- **Python**: v3.12 or v3.14
- **MongoDB**: v7.0 running locally on port `27017`

### 1. Clone Repository
```bash
git clone https://github.com/Sujaykumar960/Job-Application-Tracker.git
cd Job-Application-Tracker
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Seed dataset (100 jobs, 50 sample applications, curriculum, and users):
python app/seed.py

# Start FastAPI development server on port 8000:
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# In the project root directory:
npm install
cp .env.example .env

# Start Vite development server (Port 3000):
npm run dev
```

Visit `http://localhost:3000` to interact with the application.

---

## 🐳 Containerized Production Deployment

### Docker Compose Quickstart
```bash
# 1. Setup production environment configuration:
cp .env.production.example .env.production

# 2. Build and run containers in background:
docker compose -f docker-compose.yml up -d --build

# 3. Verify health status:
docker compose ps
curl http://localhost/api/health/ready
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full Nginx reverse proxy configuration, SSL termination, and automated database backup routines.

---

## 🧪 Testing & Verification Suites

### 1. Pytest Backend Suite (397 Tests Collected)
```bash
pytest backend/tests -v --durations=10
```
- **397 automated backend tests** covering authentication, JWT token blacklist, IDOR cross-tenant isolation, Release 2 features (notes, filtering, dashboard aggregation), rate limiting, and sandbox execution safety.

### 2. Playwright Real Browser E2E Suite (34 Tests)
```bash
# Seed test database:
python backend/scripts/e2e_setup.py

# Execute end-to-end browser test matrix:
npx playwright test --reporter=list
```
- **34 browser scenarios passed (100% pass rate in ~55s)**:
  - User authentication and session preservation
  - Complete job seeker journey (search, apply, status changes, notes)
  - Recruiter candidate sourcing, applicant status updating, and resume review
  - Multi-user data privacy and cross-tenant boundary verification
  - Responsive layout validation across laptop viewports

### 3. Production Build Compilation
```bash
npm run build
```
- Compiles TypeScript and builds production bundles using Vite with **0 errors**.

---

## 🔒 Security Architecture & Governance

- **Strict Multi-Tenancy & IDOR Defense**: All application and resume lookups strictly scope queries to the authenticated user's ID. Cross-tenant access attempts return authoritative `403 Forbidden` or `404 Not Found` responses to eliminate resource enumeration.
- **Cryptographic Security**: Passwords hashed with Bcrypt (12 work factor); JWT tokens signed with `HS256` and validated against an in-memory/database revocation blacklist on every request.
- **Code Execution Sandbox**: Subprocess execution in the learning sandbox is isolated with memory bounds (`RLIMIT_AS`), CPU limits (`RLIMIT_CPU`), process isolation, and 5-second timeout execution guardrails.
- **Input Sanitization**: File uploads inspect binary magic bytes (rejecting spoofed MIME types) and all search parameters are sanitized against regex injection.

---

## 📄 License

CareerX is open-source software licensed under the [MIT License](LICENSE).

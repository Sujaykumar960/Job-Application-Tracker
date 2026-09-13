# CareerX — Enterprise AI Career & Talent Platform

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?logo=githubactions)](.github/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/Pytest-378%20Passed-success?logo=pytest)](backend/tests/)
[![E2E Tests](https://img.shields.io/badge/Playwright-34%2F34%20Passed-success?logo=playwright)](tests/e2e/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready%20(RC1)-emerald)]()
[![License](https://img.shields.io/badge/License-MIT-gray)]()

**CareerX** is an enterprise-grade AI-powered career platform and applicant tracking system designed for modern engineers, recruiters, and platform administrators. Built with a **laptop-first responsive design philosophy** optimized for 1366×768, 1440×900, and 1536×864 resolutions with a 1400px constraint, powered by a high-throughput **FastAPI** backend and **MongoDB 7.0** document database.

---

## 🏗️ Architecture & Topology

```
                                [ HTTPS Ingress ]
                                        │
                                        ▼
                        [ Nginx Reverse Proxy / Static ]
                                  Port 80 / 443
                                        │
            ┌───────────────────────────┴───────────────────────────┐
            ▼                                                       ▼
  [ React 18 SPA Frontend ]                               [ FastAPI Backend API ]
  - Vite + TypeScript + Tailwind                          - Python 3.12 (Uvicorn Workers)
  - Monaco IDE Code Sandbox                               - JWT Bearer Auth & RBAC
  - Recharts Funnel & Radar Analytics                     - Prometheus Telemetry (/metrics)
  - WebSocket Chat Client                                 - Structured JSON Logging
            │                                                       │
            │                                                       ▼
            └─────────────────────────────────────────────► [ MongoDB 7.0 Database ]
                                                            - Compound & Text Indexes
                                                            - Isolated E2E Database
```

---

## 🚀 Key Platform Modules

### 1. Job & Internship Application Pipeline
- **Dual Visualizations**: Interactive Drag-and-Drop Kanban Board and High-Density Tabular View.
- **Stage Progression**: 6 stage lifecycle columns (`Wishlist`, `Applied`, `Interviewing`, `Offered`, `Rejected`, `Accepted`).
- **Conversion Funnel Analytics**: Dynamic conversion calculators for interview rates, offer conversion rates, and response velocity.

### 2. AI Resume Analysis & ATS Scoring Engine
- **ATS Compatibility Dial & 4-Pillar Diagnostic**: Keywords & Hard Skills, Quantified Metrics & Impact, Formatting & ATS Readability, Section Completeness.
- **Real File Persistence**: Multi-part upload handling `.pdf` and `.docx` formats with magic byte MIME inspection and file size guardrails.
- **AI Bullet Enhancer (STAR Method)**: Rewriter converting passive statements into metric-driven achievements.
- **Local Fallback Mode**: Graceful deterministic fallback scoring when external AI providers (Groq) are unconfigured.

### 3. Skill-Gap Matrix & Remediation Roadmaps
- **Competency Comparison**: Automatically extracts skills from user profiles/resumes and cross-evaluates against job listings.
- **Direct Practice Bridges**: Identifies missing competencies and directly links to CareerX coding problems and system design modules.

### 4. Developer Learning Hub & Monaco IDE Sandbox
- **Interactive Code Editor**: `@monaco-editor/react` supporting Python 3, TypeScript, JavaScript, Go, and Java.
- **Curated Problem Repository**: Filterable by difficulty (Easy, Medium, Hard), topic tags (DP, Arrays, Graphs), and target companies.
- **Backend Architecture Track**: Distributed systems case studies (Rate Limiting, Cache Stampede, LSM-Trees vs B-Trees, Kafka Outbox).
- **Persistent Progress Tracking**: Lesson completions persist to MongoDB and render dynamically on user radar charts.

### 5. Talent Discovery & Recruiter Management Portal
- **Recruiter Role Portal**: Dedicated workspace for hiring managers and recruiters (`role="recruiter"`).
- **Job Creation & Lifecycle**: Job posting modal with skills tagging, compensation ranges, and 1-click status toggles (Publish / Close).
- **Candidate Pipeline Review**: Filterable applicant tables with candidate dossiers and ATS score rankings.

### 6. Real-Time Chat & Professional Network
- **WebSocket Direct Messaging**: Low-latency candidate-recruiter messaging (`/api/ws/chat`) with connection state recovery.
- **Community Engineering Feed**: Rich technical discussion posts, tags, media attachments, and real-time like toggles.
- **Connection Lifecycle**: Connection requests, acceptance workflows, and reciprocal user following.

### 7. Interview Schedule & Milestone Calendar
- **Interactive Calendar Heatmap**: Chronological agenda grid and monthly schedule view.
- **Timeline Milestones**: Technical rounds, take-home cutoffs, and offer deadlines with reload persistence.

### 8. Platform Governance & Admin Portal (`/admin`)
- **Executive KPI Dashboard**: Platform-wide metrics for total users, active listings, application throughput, and system health.
- **User Lifecycle Governance**: Paginated user management table with search, role modification (`seeker`, `recruiter`, `admin`), and account suspension.
- **Content Moderation Queue**: Rapid takedown of flagged community discussions and spam.
- **Immutable Audit Trail**: Administrative action logging with actor ID, target ID, and event timestamps.

---

## 🛠️ Technology Stack

| Domain | Technologies |
|---|---|
| **Frontend UI** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Data Visualization** | Recharts (ResponsiveContainer, BarChart, PolarRadarChart) |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Backend API** | FastAPI (ASGI), Python 3.12/3.14, Uvicorn, Pydantic v2 |
| **Database** | MongoDB 7.0, Motor (AsyncIO Driver), PyMongo |
| **Security & Auth** | JWT (`HS256`), Bcrypt hashing (12 rounds), Token revocation blacklist, Role-Based Access Control |
| **Observability** | Structured JSON request logging, Prometheus `/metrics`, Deep readiness probe (`/api/health/ready`) |
| **Deployment** | Docker multi-stage builds, Docker Compose, Alpine Nginx reverse proxy |
| **Test Automation** | Pytest, Pytest-AsyncIO, Starlette TestClient, Playwright (Chromium Browser E2E) |

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 20 LTS and npm
- Python 3.12 or 3.14
- MongoDB running locally on `mongodb://localhost:27017`

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run database seeder (Optional - seeds sample jobs, courses, and candidates)
python app/seed.py

# Start FastAPI development server (Port 8000)
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
# In project root:
npm install
cp .env.example .env

# Start Vite development server (Port 3000 or 3001)
npm run dev
```

---

## 🐳 Production Deployment (Docker Compose)

CareerX is fully containerized and production-ready with Docker Compose:

```bash
# 1. Prepare production environment
cp .env.production.example .env.production

# 2. Build and launch multi-container stack in background
docker compose --env-file .env.production up -d --build

# 3. Verify container status and health
docker compose ps
curl http://localhost/api/health/ready
```

For complete details on SSL certificates, database backups, and reverse proxying, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🧪 Testing & Verification Suites

### 1. Full Backend Pytest Regression Suite (378 Tests)
```bash
pytest backend/tests -v
```
- **378 passed, 1 skipped (optional live Groq test)**
- Verifies authentication, token revocation, RBAC security, resume parsing, job matching, learning tracks, and admin governance.

### 2. Real Browser Playwright End-to-End Suite (34 Tests)
```bash
# Seed isolated test database:
python backend/e2e_setup.py

# Run Playwright Chromium tests in headless mode:
npx playwright test --reporter=list
```
- **34 passed (100% pass rate in ~55s)**
- Verifies real browser user flows: login, registration, seeker job application pipeline, resume upload, recruiter job postings, multi-user isolation boundaries, failure mode recovery, and responsive viewports.

### 3. Frontend Production Build Check
```bash
npm run build
```
- Compiles TypeScript and builds production distribution with **0 errors**.

---

## 🔒 Security & RBAC Policies

- **Role Hierarchy**:
  - `seeker`: Can apply to jobs, manage personal resumes, track learning progress, and interact in community feed. Forbidden from `/recruiter` and `/admin`.
  - `recruiter`: Can post and manage company job listings, review applicant dossiers, advance candidate interview stages, and initiate candidate chats. Forbidden from `/admin`.
  - `admin`: Superuser role with full access to platform KPI metrics, user directory moderation, content takedowns, and security audit logs.
- **Tenant Isolation**: Cross-tenant data (applications, resumes, private contact info) is enforced server-side in MongoDB queries.
- **Token Invalidation**: User sign-out immediately revokes the JWT token into the database-backed token revocation collection.
- **Upload Safety**: PDF and DOCX files are validated by magic headers and sanitized before disk persistence.

---

## 📄 License & Attribution

CareerX is open-source software licensed under the MIT License.

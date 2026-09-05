# CareerX — Production FastAPI + MongoDB Backend

Production-ready backend for the **CareerX** platform built with **Python 3.11+**, **FastAPI**, **MongoDB (Motor/PyMongo Async)**, **Pydantic v2**, **JWT Authentication**, and **WebSockets**.

Designed specifically around CareerX's frontend contract, data structures, and WebSocket communication protocol.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | FastAPI (Async ASGI) |
| **Server** | Uvicorn (uvloop & httptools) |
| **Database** | MongoDB with Motor (official async PyMongo driver) |
| **Validation & Serialization** | Pydantic v2 & `pydantic-settings` |
| **Authentication** | JWT (PyJWT HS256) + `bcrypt` password hashing |
| **Real-Time Communication** | Native FastAPI WebSockets (`/api/ws/chat`) |
| **Testing** | Pytest, `pytest-asyncio`, Starlette TestClient, HTTPX |

---

## 📂 Project Architecture

```
backend/
├── app/
│   ├── main.py                     # App factory, lifespan context, CORS, error handlers
│   ├── config.py                   # Pydantic v2 BaseSettings loading environment variables
│   ├── database.py                 # Centralized MongoDB async client & startup index creation
│   ├── dependencies.py             # FastAPI dependency injection (DB, auth, role guards)
│   │
│   ├── models/                     # Internal domain models matching MongoDB documents
│   │   ├── user.py                 # UserModel & UserRole
│   │   ├── profile.py              # ProfileModel & ProfilePrivacySettings
│   │   ├── application.py          # ApplicationModel & Status
│   │   ├── resume.py               # ResumeModel & ResumeAnalysisModel
│   │   ├── job.py                  # JobModel
│   │   ├── question.py             # QuestionModel & TestCases
│   │   ├── progress.py             # ProgressModel & ActivityHistory
│   │   ├── post.py                 # PostModel & CommentModel
│   │   ├── connection.py           # ConnectionModel & Status
│   │   ├── chat.py                 # MessageModel & ConversationModel
│   │   ├── company.py              # CompanyModel & EmployeeSummary
│   │   ├── notification.py         # NotificationModel
│   │   └── recruiter.py            # RecruiterModel
│   │
│   ├── schemas/                    # Pydantic v2 schemas matching frontend TypeScript types
│   │   ├── common.py               # HealthResponse, ApiErrorResponse, StandardSuccessResponse
│   │   ├── auth.py                 # LoginCredentials, RegisterData, AuthResponse, UserProfile
│   │   ├── user.py                 # UserProfileUpdate, ProfilePrivacySettings
│   │   ├── application.py          # ApplicationCreate, ApplicationUpdate, ApplicationResponse
│   │   ├── resume.py               # ResumeUploadResponse, AtsBreakdown, ResumeAnalysisResult
│   │   ├── job.py                  # JobItem, JobMatchAnalysis
│   │   ├── question.py             # CodingProblem, ExecuteCodePayload, ExecutionResult
│   │   ├── progress.py             # ProgressOverview, ActivityDataPoint, SkillTrajectory
│   │   ├── post.py                 # FeedPost, FeedComment, PostCreate, CommentCreate
│   │   ├── connection.py           # NetworkUser, ConnectionRespondRequest
│   │   ├── chat.py                 # ChatMessage, ChatConversation, WebSocketEnvelope
│   │   ├── company.py              # CompanyProfile, CompanyFollowResponse
│   │   ├── notification.py         # CareerNotification
│   │   ├── recruiter.py            # RecruiterCandidate, RecruiterMetrics
│   │   └── ai.py                   # AiResponse, CodingHintRequest, ErrorExplanationRequest
│   │
│   ├── routers/                    # Modular API route controllers under /api
│   │   ├── api_router.py           # Central router combining all sub-routers
│   │   ├── health.py               # GET /api/health -> {"status": "ok"}
│   │   ├── auth.py                 # /api/auth (login, register, me, logout, refresh)
│   │   ├── users.py                # /api/users (me, {id}, privacy, avatar)
│   │   ├── applications.py         # /api/applications (CRUD, filter by status)
│   │   ├── resumes.py              # /api/resume (upload, analyze, analysis)
│   │   ├── jobs.py                 # /api/jobs (list, details, match)
│   │   ├── questions.py            # /api/questions (list, details)
│   │   ├── code_execution.py       # /api/code/execute
│   │   ├── progress.py             # /api/progress (overview, activity, skills)
│   │   ├── posts.py                # /api/posts (list, create, like, comment, bookmark)
│   │   ├── network.py              # /api/network (connections, requests, suggestions, follow)
│   │   ├── messages.py             # /api/messages/conversations (list, history, send, read)
│   │   ├── companies.py            # /api/companies (list, details, jobs, follow)
│   │   ├── recruiter.py            # /api/recruiter (metrics, candidates, shortlist)
│   │   ├── notifications.py        # /api/notifications (list, read, read-all, clear-read)
│   │   └── ai.py                   # /api/ai (hint, explain-error, explain-code, optimize)
│   │
│   ├── services/                   # Business logic layer (AuthService, etc.)
│   ├── repositories/               # MongoDB query abstraction layer (BaseRepository, UserRepository)
│   ├── websocket/                  # Real-time WebSocket connection manager & chat router
│   ├── utils/                      # Security (bcrypt, PyJWT) and serialization helpers
│   └── middleware/                 # Unified error handler matching ApiErrorResponse
│
├── tests/                          # Pytest test suite
│   ├── conftest.py
│   ├── test_health.py
│   └── test_auth.py
│
├── .env.example                    # Environment variables template
├── .env                            # Local development configuration
├── requirements.txt                # Pinned production dependencies
└── README.md                       # Setup and documentation
```

---

## 🍃 MongoDB Local Setup Instructions

### Windows (Local Service)
1. **Download & Install**: Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community) and run the installer (`.msi`).
2. **Install as Windows Service**: Select "Run MongoDB as a Service". It defaults to port `27017` at `mongodb://localhost:27017`.
3. **Verify Service Status**:
   In PowerShell (as Administrator or user):
   ```powershell
   Get-Service MongoDB
   ```
   If stopped, start it with:
   ```powershell
   Start-Service MongoDB
   ```
4. **Test Connection**:
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 27017
   ```
   Should output `TcpTestSucceeded : True`.

### Alternative: Docker Container
If preferred, you can run MongoDB in a lightweight Docker container:
```bash
docker run -d --name mongodb -p 27017:27017 -v mongo_data:/data/db mongo:latest
```

---

## 🚀 Quickstart & Setup Instructions

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Set Up Virtual Environment (Recommended)
```bash
# Windows
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` (already pre-populated for local development):
```bash
cp .env.example .env
```

Review `.env`:
```env
ENVIRONMENT=development
APP_NAME=CareerX Backend API
API_PREFIX=/api

HOST=0.0.0.0
PORT=8000

MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=careerx_db

JWT_SECRET_KEY=careerx_dev_secret_key_8f3d1b4a9e2c60751a8d0e7f4c3b2a19
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

FRONTEND_ORIGIN=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173
```

### 5. Start the Server
From the `backend/` directory, launch Uvicorn:
```bash
uvicorn app.main:app --reload --port 8000
```

The server will initialize:
- MongoDB connection verified on `127.0.0.1:27017`
- Essential collection indexes automatically verified/created
- CORS configured for `http://localhost:3000` (and configured origins)
- Interactive API Docs available at `http://localhost:8000/docs`
- Health check available at `http://localhost:8000/api/health`

---

## 🌱 Database Seeding & Development Accounts

The CareerX development seeding engine transforms all frontend mock data sources (`mockData.ts`, `mockConversations.ts`, `mockFeed.ts`, `mockNetwork.ts`, `mockNotifications.ts`, `mockRecruiterData.ts`) into fully relational MongoDB documents.

### Run Seeder
```bash
# Idempotent seed (upserts records without creating duplicates)
python -m app.seed

# Clean re-seed (drops seeded collections first)
python -m app.seed --reset
```

### Pre-Configured Development Accounts

> [!WARNING]
> **DEVELOPMENT ONLY**: The development passwords listed below are for local testing and demonstration purposes only. **Never use these passwords in production environments.**

All pre-configured accounts share the standard development password: `DevPassword123!`

| Name | Email | Password | Role | Company | Purpose |
|---|---|---|---|---|---|
| **Alex Rivera** | `alex.rivera@devmail.io` | `DevPassword123!` | `seeker` | CloudScale | Primary job seeker profile with 8 active applications, 2 chat threads, 7 notifications, and community feed posts. |
| **Sarah Lin** | `sarah.lin@stripe.com` | `DevPassword123!` | `recruiter` | Stripe | Stripe Technical Recruiter with candidate search access, interview stage updates, and candidate shortlisting. |
| **CloudScale Recruiter** | `recruiter@cloudscale.com` | `DevPassword123!` | `recruiter` | CloudScale | Recruiter account for verifying employer candidate cloaking privacy. |
| **Marcus Vance** | `marcus.vance@stripe.com` | `DevPassword123!` | `seeker` | Stripe | Staff SRE peer with incoming connection requests and active chat history. |
| **Elena Rostova** | `elena.rostova@example.com` | `DevPassword123!` | `seeker` | Freelance | Connected peer, candidate profile, and feed author. |
| **CareerX Admin** | `admin@careerx.io` | `DevPassword123!` | `admin` | CareerX | Administrative compliance and management account. |

---

## 🧪 Testing

Run the automated test suite with `pytest`:
```bash
pytest
```

---

## 📡 Key Endpoints Reference

### Health
- `GET /api/health` -> `{"status": "ok"}`

### Authentication & User
- `POST /api/auth/register` -> Register new candidate or recruiter
- `POST /api/auth/login` -> Authenticate and receive JWT + user profile
- `GET /api/auth/me` -> Get current user from token
- `POST /api/auth/logout` -> Session logout
- `POST /api/auth/refresh` -> Refresh JWT token
- `GET /api/users/me` -> Current user profile
- `PATCH /api/users/me` -> Update profile attributes
- `PUT /api/users/me/privacy` -> Update recruiter visibility and privacy directives
- `POST /api/users/me/avatar` -> Upload profile avatar

### Job Applications
- `GET /api/applications` -> List tracked applications (optional `?status=Applied`)
- `GET /api/applications/{id}` -> Get application details
- `POST /api/applications` -> Submit new tracked application
- `PATCH /api/applications/{id}` -> Update application stage/priority/notes
- `DELETE /api/applications/{id}` -> Delete application

### Real-Time WebSocket Chat
- **Endpoint**: `ws://localhost:8000/api/ws/chat` (optional query: `?token=<jwt_token>`)
- **Envelope Protocol**:
  ```json
  {
    "type": "message" | "typing" | "read" | "presence" | "ping",
    "payload": { ... }
  }
  ```

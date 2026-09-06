# CareerX — AI-Powered Career Platform

**CareerX** is an enterprise-grade AI-powered career platform designed for modern software engineers and technical recruiters.

The repository is structured as two cleanly separated, standalone projects (`frontend/` and `backend/`) with root orchestrator scripts to run them individually or concurrently.

---

## 📁 Repository Structure

```text
Job-Application_Tracker/
├── frontend/                     # 🌐 Standalone React + Vite + TypeScript Frontend
│   ├── src/                      # Components, Pages, State, API clients
│   ├── public/                   # Static assets & favicon
│   ├── index.html                # Single-page application entry HTML
│   ├── vite.config.ts            # Vite bundler configuration
│   ├── tsconfig.json             # TypeScript configuration
│   ├── tailwind.config.js        # Tailwind CSS design system tokens
│   ├── .env                      # Frontend environment (VITE_API_BASE_URL)
│   └── package.json              # Frontend-only dependencies & scripts
│
├── backend/                      # ⚡ Standalone FastAPI + MongoDB Atlas Backend
│   ├── app/                      # Routers, Services, Repositories, Schemas
│   │   ├── routers/              # Resumes, Auth, Jobs, Applications, Users, etc.
│   │   ├── services/             # AI Groq Engine, Auth, Scoring services
│   │   ├── schemas/              # Pydantic data contracts
│   │   ├── database.py           # MongoDB connection & index managers
│   │   └── main.py               # FastAPI application entry point
│   ├── tests/                    # Backend automated tests
│   ├── requirements.txt          # Python dependencies (FastAPI, Motor, Groq, PyPDF, etc.)
│   └── .env                      # Backend environment (MongoDB URI, Groq API Key)
│
├── package.json                  # Root orchestrator scripts (dev:all, dev:frontend, dev:backend)
├── start-dev.bat                 # 🚀 Windows double-click dual launcher
├── start-dev.ps1                 # 🚀 PowerShell dual launcher
└── README.md                     # Documentation
```

---

## 🚀 Quick Start Guide

### Option 1: Run Everything Together from Root (Recommended)

From the project root directory, run:

```bash
# 1. Install all dependencies (Root, Frontend, Backend)
npm run install:all

# 2. Start both Backend (Port 8000) and Frontend (Port 3000) simultaneously
npm run dev
# or
npm run dev:all
```

Alternatively, on Windows you can simply double-click **`start-dev.bat`** or run:
```powershell
.\start-dev.ps1
```

---

### Option 2: Run Separately in Dedicated Terminals

#### Terminal 1 — Backend (FastAPI + MongoDB + Groq AI):
```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

#### Terminal 2 — Frontend (React 18 + Vite + Tailwind):
```powershell
cd frontend
npm run dev
```
- **Frontend App**: `http://localhost:3000`

---

## 🛠️ Root Orchestrator Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` / `npm run dev:all` | Runs Backend and Frontend concurrently in a single terminal |
| `npm run dev:frontend` | Runs only the React frontend on `http://localhost:3000` |
| `npm run dev:backend` | Runs only the FastAPI backend on `http://localhost:8000` |
| `npm run build` | Builds the frontend production bundle (`frontend/dist`) |
| `npm run install:all` | Installs dependencies across root, `frontend/`, and `backend/` |

---

## 🔑 Environment Configuration

- **Frontend (`frontend/.env`)**:
  ```env
  VITE_API_BASE_URL=http://localhost:8000/api
  ```

- **Backend (`backend/.env`)**:
  ```env
  ENVIRONMENT=development
  PORT=8000
  MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.ol1xg9x.mongodb.net/?appName=Cluster0
  MONGODB_DB_NAME=careerx_db
  GROQ_API_KEY=gsk_...
  GROQ_MODEL=openai/gpt-oss-120b
  CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173
  ```

---

## 🧪 Testing & Verification

- **Frontend Build Verification**:
  ```bash
  cd frontend
  npm run build
  ```

- **Backend Tests**:
  ```bash
  cd backend
  pytest tests/
  ```

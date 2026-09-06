# Contributing to CareerX

Thank you for your interest in contributing! This guide covers everything you need to get started.

---

## 📦 Repository Structure

```
Job-Application-Tracker/
├── backend/          # FastAPI + MongoDB Atlas + Groq AI
│   ├── app/          # Routers, Services, Repositories, Schemas
│   └── tests/        # pytest test suite (27 files)
├── frontend/         # React 18 + Vite + TypeScript + Tailwind (WIP)
└── .github/
    └── workflows/    # GitHub Actions CI
```

---

## 🚀 Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/Sujaykumar960/Job-Application-Tracker.git
cd Job-Application-Tracker
```

### 2. Set up the backend

```powershell
cd backend

# Create a virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1        # Windows

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure environment variables

Create `backend/.env`:

```env
ENVIRONMENT=development
PORT=8000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.ol1xg9x.mongodb.net/?appName=Cluster0
MONGODB_DB_NAME=careerx_db
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 4. Run the backend

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

- **API**: `http://localhost:8000`
- **Swagger docs**: `http://localhost:8000/docs`

---

## 🧪 Running Tests

```powershell
cd backend

# Run all tests
pytest tests/ -v

# Run a specific file
pytest tests/test_edge_cases.py -v

# Run with short traceback
pytest tests/ --tb=short -q
```

> **Note**: Tests require a running MongoDB instance (local or Atlas). Set `MONGODB_URI` accordingly in your `.env`.

---

## 🌿 Branch Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/resume-pdf-export` |
| Bug fix | `fix/<short-description>` | `fix/websocket-token-key` |
| Tests | `test/<short-description>` | `test/auth-edge-cases` |
| Refactor | `refactor/<short-description>` | `refactor/ai-service-models` |
| Docs | `docs/<short-description>` | `docs/contributing-guide` |
| CI | `ci/<short-description>` | `ci/github-actions-backend` |

---

## ✅ Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Your branch is up to date with `main`
- [ ] All existing tests pass: `pytest tests/ -q`
- [ ] New features include at least one test
- [ ] Code is formatted with [Black](https://black.readthedocs.io/): `black app/ tests/`
- [ ] Imports are sorted with [isort](https://pycqa.github.io/isort/): `isort app/ tests/`
- [ ] No secrets or `.env` files are committed

---

## 🎨 Code Style

- **Formatter**: [Black](https://black.readthedocs.io/) (line length 100)
- **Import sorting**: [isort](https://pycqa.github.io/isort/) (Black profile)
- **Type hints**: Required for all new functions and methods
- **Docstrings**: Required for all public classes and methods

Install dev tools:

```bash
pip install black isort
black app/ tests/
isort app/ tests/
```

---

## 🐛 Reporting Bugs

Open a [GitHub Issue](https://github.com/Sujaykumar960/Job-Application-Tracker/issues) with:

1. A clear description of the bug
2. Steps to reproduce
3. Expected vs actual behavior
4. Python version and OS

---

## 💡 Suggesting Features

Open a GitHub Issue with the label `enhancement` and describe:

- The problem you're solving
- Your proposed solution
- Any relevant mockups or API sketches

---

## 📄 License

This project is open source. Please respect the existing license when contributing.

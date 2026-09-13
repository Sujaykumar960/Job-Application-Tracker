# CareerX — Real Browser End-to-End (E2E) Test Suite

## Overview
CareerX Phase 11 verified the application as a real full-stack production platform using **Playwright** with real **Chromium** browser automation against a live FastAPI backend and isolated MongoDB test database.

> [!IMPORTANT]
> **Strict Zero-Mock Policy**: Tests do NOT use simulated backend mocks, fake API responses, or synthetic auth bypasses. Every test runs in a real browser session executing authentic HTTP requests against the FastAPI backend, persisting real documents in MongoDB and uploading real files to disk.

---

## Architecture & Isolation Safeguards

### 1. Database & Storage Isolation
- **Test Database**: `careerx_e2e_db`
- **Test Upload Directory**: `uploads_e2e`
- **Backend Environment**: `backend/.env.e2e` (Port 8001)
- **Frontend Environment**: `http://localhost:3001`
- **Safety Abort Guard**: `backend/scripts/e2e_setup.py` strictly checks `settings.MONGODB_DB_NAME == "careerx_e2e_db"`. If connected to production or default `job_tracker` / `careerx_db`, it immediately halts execution with an exception.

### 2. Pre-Seeded Test Personas
The automated E2E setup seeds three distinct test users in `careerx_e2e_db`:
| Persona | Email | Password | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Seeker** | `seeker@careerx.com` | `Password123!` | `seeker` | Primary job seeker persona with pre-seeded profile, resumes, and calendar events. |
| **Bob Recruiter** | `recruiter@careerx.com` | `Password123!` | `recruiter` | Talent partner for TechNova Solutions with pre-seeded job postings and pipeline. |
| **Charlie Seeker** | `seeker2@careerx.com` | `Password123!` | `seeker` | Secondary seeker persona used to verify multi-tenant isolation, privacy, and unauthorized access. |

---

## Test Suites

| Suite | File | Tests | Coverage |
| :--- | :--- | :---: | :--- |
| **Authentication & Authorization** | `tests/e2e/auth.spec.ts` | 10 | Protected route redirects, validation errors, bad credentials, session persistence across reload, seeker & recruiter registration, 8-char password validation, logout protection, recruiter role warning banner. |
| **Seeker User Journey** | `tests/e2e/seeker-journey.spec.ts` | 8 | Dashboard metrics, marketplace keyword search & application submission, pipeline tracking, PDF resume upload, skill gap analysis, learning hub lesson completion, community feed posting & likes, calendar milestone creation & reload persistence. |
| **Recruiter User Journey** | `tests/e2e/recruiter-journey.spec.ts` | 4 | Recruiter talent portal metrics, posting new engineering job listings via modal, toggling listing status (published/closed), applicant pipeline review & status transitions. |
| **Multi-User Privacy** | `tests/e2e/multi-user-privacy.spec.ts` | 5 | Seeker B blocked from Seeker A's applications/resumes, public profile viewing without edit buttons or credential leakage, post moderation protection, notification session isolation, recruiter candidate isolation. |
| **Failure Modes & Resilience** | `tests/e2e/failure-modes.spec.ts` | 3 | 404 page rendering and return-to-dashboard navigation, 401 token invalidation redirecting to login, malformed URL query parameter handling without crash. |
| **Responsive UI & Viewports** | `tests/e2e/responsive-ui.spec.ts` | 4 | Viewport integrity and horizontal scroll overflow verification across Desktop (1280x720), Tablet (768x1024), Mobile (375x667), and Compact Mobile (320x568). |

**Total Tests**: **34 tests** (100% passing).

---

## Running the Tests

### Prerequisites
1. **MongoDB** running locally on port 27017.
2. **Backend Python virtual environment** activated with requirements installed.
3. **Frontend node modules** installed.

### Execution Commands

```bash
# Run all 34 browser E2E tests (headless Chromium)
npx playwright test

# Run all tests with line-by-line reporter
npx playwright test --reporter=line

# Run a specific test suite
npx playwright test tests/e2e/auth.spec.ts
npx playwright test tests/e2e/seeker-journey.spec.ts
npx playwright test tests/e2e/recruiter-journey.spec.ts
npx playwright test tests/e2e/multi-user-privacy.spec.ts
npx playwright test tests/e2e/failure-modes.spec.ts
npx playwright test tests/e2e/responsive-ui.spec.ts

# Run tests with UI debugger
npx playwright test --ui

# View HTML test execution report
npx playwright show-report
```

---

## Automatic Lifecycle (`playwright.config.ts`)
When `npx playwright test` is invoked:
1. **Web Server Orchestration**: Playwright automatically starts the FastAPI backend on port 8001 using `backend/.env.e2e`.
2. **Global Setup**: Playwright executes `tests/e2e/helpers/global-setup.ts`, invoking `backend/scripts/e2e_setup.py` to wipe `careerx_e2e_db`, recreate indexes, seed test personas, and prepare `uploads_e2e`.
3. **Browser Execution**: Chromium spawns in parallel/isolated contexts, capturing traces, screenshots, and videos on failure.

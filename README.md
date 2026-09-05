# CareerX — AI-Powered Career Platform

**CareerX** is an enterprise-grade AI-powered career platform designed for modern engineers and recruiters. Built with a **laptop-first responsive design philosophy** optimized specifically for 1366×768, 1440×900, and 1536×864 resolutions with a 1400px maximum content constraint.

---

## 🚀 Key Modules & Capabilities

### 1. Job & Internship Application Tracker
- **Kanban Board & High-Density Table Views**: 6 stage progression columns (`Wishlist`, `Applied`, `Interviewing`, `Offered`, `Rejected`, `Accepted`).
- **Application Modals & Detail Drawers**: Track salary ranges, contact persons, interview rounds timeline with completion toggles, video call meeting links, and debrief notes.
- **Conversion Funnel Analytics**: Interactive bar charts (Recharts) computing real-time interview rates, offer conversion rates, and response rates.

### 2. AI Resume Analysis & ATS Scoring Engine
- **ATS Compatibility Dial & 4-Pillar Score Breakdown**: Keywords & Hard Skills, Impact & Quantified Metrics, Formatting & ATS Readability, Section Completeness.
- **Automated Diagnostic Flags**: Critical, Warning, and Info badges with 1-click recruiter remediation recommendations.
- **AI Bullet Enhancer (STAR Method)**: Live bullet rewriter that converts passive phrases into high-impact bullets with action verbs and quantifiable throughput/latency metrics.

### 3. Resume-to-Job Matching & Skill-Gap Analysis
- **Match Evaluator**: Compares profile skills against job descriptions.
- **Skill-Gap Matrix**: Green badges for matched skills and rose badges for missing critical competencies.
- **Gap Remediation Roadmaps**: Direct links to CareerX DSA problems, backend modules, and language tracks to close identified skill gaps.

### 4. Developer Learning Hub & Interactive Monaco IDE
- **Interactive Coding Sandbox**: Embedded `@monaco-editor/react` with syntax highlighting across Python 3, JavaScript (ES6), TypeScript, Go (1.23), and Java 21.
- **Problem Repository**: Filterable by difficulty (Easy/Medium/Hard), category (Two Pointers, Strings, DP, Stack/Queue), and target companies.
- **Simulated Test Execution**: Test case runner evaluating inputs against expected outputs with runtime benchmarks and memory consumption.
- **Backend Architecture Track**: Real-world distributed systems scenarios (Distributed Rate Limiting with Redis Lua scripts, B-Tree vs LSM database indexing, Redis Cache Stampede prevention, Kafka Outbox pattern, Zero-downtime DB migrations).
- **Language Tracks & Competency Radar**: Deep dives into Python, TypeScript, and Go, paired with a Polar Radar Chart showing domain mastery.

### 5. Jobs & Companies Directory
- Curated engineering roles with verified compensation bands and 1-click "Add to Tracker".
- Company profiles featuring verified engineering tech stacks and culture highlights.

### 6. Recruiter Talent Discovery Portal
- Dedicated **Recruiter Mode** toggle in the top navigation.
- Candidate discovery filterable by skills, minimum ATS score (80+, 85+, 90+), and readiness status.
- Direct candidate invitations to technical interviews and direct messaging.

### 7. Professional Social Network & Community Feed
- Activity feed for interview debriefs, system design patterns, and referrals.
- Code snippet attachments, comment threads, likes, and recommended connections.

### 8. Real-Time Style Direct Messaging
- Recruiter-candidate chat with online presence indicators and simulated recruiter typing/replies.

### 9. Interview Schedule & Deadline Calendar
- Chronological timeline of technical rounds, offer decision cutoffs, and monthly calendar heatmaps.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Framework & Tooling** | React 18, Vite, TypeScript |
| **Styling & Design System** | Tailwind CSS, Lucide React icons, Glassmorphism utilities |
| **Forms & Validation** | React Hook Form, Zod, `@hookform/resolvers` |
| **Data Visualization** | Recharts (BarChart, RadarChart) |
| **Code Editor** | `@monaco-editor/react` |
| **Routing** | React Router v6 |
| **Networking & Services** | Axios with centralized interceptors & localStorage persistence adapters |

---

## 💻 Running the Application Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Build for production
npm run build

# 4. Preview the production build
npm run preview
```

---

## 🔌 Future FastAPI + MongoDB Backend Integration

All API logic is strictly decoupled from UI components in `src/services/`.
To switch from mock adapters to a live FastAPI + MongoDB backend:
1. Configure `VITE_API_BASE_URL` in `.env`:
   ```env
   VITE_API_BASE_URL=https://api.careerx.io/api/v1
   ```
2. The existing `apiClient` (`src/services/apiClient.ts`) already handles JWT token injection via `localStorage.getItem('careerx_auth_token')` and standard HTTP status code interception.

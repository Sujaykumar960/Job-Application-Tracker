# CareerX — User Acceptance Testing (UAT) Checklist

This document provides a systematic manual verification protocol for stakeholders, QA engineers, and release managers validating release readiness across the three core user personas: **Job Seeker**, **Recruiter**, and **Platform Administrator**.

---

## Persona 1: Job Seeker Journey

| Step | User Action | Expected Result | Verified (Y/N) |
| :---: | :--- | :--- | :---: |
| **1.1** | Visit `/register` and create a seeker account | Account created, redirected to Dashboard, welcome toast appears. | [ ] |
| **1.2** | Navigate to `/profile` and edit headline, bio, and skills | Profile updates immediately and reflects on community feed. | [ ] |
| **1.3** | Visit `/resume` and upload a `.pdf` or `.docx` resume | File uploads to storage, parsed, and ATS diagnostic dial renders. | [ ] |
| **1.4** | Visit `/jobs` and filter by keyword (e.g. "React") | Live filter responds; clicking "Quick Apply" opens submission modal. | [ ] |
| **1.5** | Submit job application | Application saved, visible in `/applications` Kanban & Table view. | [ ] |
| **1.6** | Move application card from "Applied" to "Interviewing" | Stage transition updates conversion rate metrics dynamically. | [ ] |
| **1.7** | Visit `/learning` and complete a syllabus module lesson | Progress bar updates and persists across browser reload. | [ ] |
| **1.8** | Visit `/community` and publish a technical post with tags | Post appears in live feed; other users can like and comment. | [ ] |
| **1.9** | Visit `/calendar` and schedule an interview round | Calendar event saved, timeline renders with countdown badge. | [ ] |

---

## Persona 2: Recruiter Journey

| Step | User Action | Expected Result | Verified (Y/N) |
| :---: | :--- | :--- | :---: |
| **2.1** | Log in as recruiter (`recruiter@careerx.com`) | Redirects to Recruiter Portal (`/recruiter`). | [ ] |
| **2.2** | Inspect Recruiter Metrics | Shows total active openings, total applicant volume, shortlists. | [ ] |
| **2.3** | Click "Post New Job" modal and fill in job specifications | Job listing created, appears in recruiter management table and `/jobs`. | [ ] |
| **2.4** | Inspect candidate applicants for posted job | Displays candidate cards with ATS scores and application status. | [ ] |
| **2.5** | Toggle candidate interview status (e.g. "Screening" → "Technical") | Stage updates; candidate receives automatic notification. | [ ] |
| **2.6** | Send candidate a direct message via `/messages` | WebSocket chat opens, messages transmit with zero page reload. | [ ] |
| **2.7** | Toggle job status to "Closed" | Job reflects closed state; unlisted from public search. | [ ] |

---

## Persona 3: Platform Administrator Journey

| Step | User Action | Expected Result | Verified (Y/N) |
| :---: | :--- | :--- | :---: |
| **3.1** | Log in as admin (`admin@careerx.com`) | Top user menu shows "Admin Governance" option. | [ ] |
| **3.2** | Navigate to `/admin` | Admin dashboard renders platform KPI cards (Users, Jobs, Apps). | [ ] |
| **3.3** | Search user directory in "User Governance" tab | Search query filters users by name or email with pagination. | [ ] |
| **3.4** | Toggle user active status ("Suspend") | User status toggles; deactivated user cannot log in. | [ ] |
| **3.5** | Open "Content Moderation" tab | Lists recent community posts with author and content snippets. | [ ] |
| **3.6** | Click "Take Down" on a flagged post | Post deleted from database; removed from live community feed. | [ ] |
| **3.7** | Inspect "Audit Logs" tab | Displays immutable record of admin actions with timestamp and actor ID. | [ ] |
| **3.8** | Check `/metrics` in browser | Returns plain-text Prometheus exposition with request metrics. | [ ] |
| **3.9** | Check `/api/health/ready` | Returns HTTP 200 with database and storage health status. | [ ] |

---

## Sign-off & Release Approval

- **Lead Integration Engineer**: ___________________________ Date: ____________
- **QA / Release Manager**: _______________________________ Date: ____________

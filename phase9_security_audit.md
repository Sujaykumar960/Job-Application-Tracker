# CAREERX — PHASE 9 SECURITY & PRODUCTION-READINESS AUDIT REPORT
**Document Reference**: SEC-AUDIT-PHASE9-001
**Date**: September 2026
**Auditor**: Senior Security & Production-Hardening Engineer
**Status**: AUDIT COMPLETE — REMEDIATION IN PROGRESS
**Baseline**: 240 backend tests passed, 1 skipped, 0 failed

---

## Executive Summary

A comprehensive, zero-mock security, privacy, authorization, data-integrity, and infrastructure audit was conducted across the CareerX platform (backend FastAPI/MongoDB services, WebSocket real-time systems, and frontend React/Vite interfaces).

The audit identified **9 security vulnerabilities and architectural hardening deficiencies** across Authentication, Role-Based Access Control (RBAC), Insecure Direct Object References (IDOR), Information Disclosure, WebSocket boundaries, and HTTP transport security.

All findings are documented below with their OWASP Top 10 classifications, CVSS v3.1 severity scores, technical root causes, impact analysis, and precise remediation plans prior to implementing fixes.

---

## Vulnerability Taxonomy & Findings Table

| ID | Title | Severity | CVSS v3.1 | OWASP Top 10 | Component |
|---|---|---|---|---|---|
| **VULN-01** | Hardcoded Demo Authentication Backdoor in Password Reset | **CRITICAL** | 9.8 | A07:2021 Identification and Authentication Failures | auth.py, ForgotPasswordPage.tsx |
| **VULN-02** | Predictable Password Reset Token & Missing Expiration Lifecycle | **HIGH** | 7.5 | A07:2021 Identification and Authentication Failures | auth.py, auth_service.py |
| **VULN-03** | Reset Token Disclosure in API Response | **HIGH** | 7.5 | A01:2021 Broken Access Control / Info Leakage | auth.py |
| **VULN-04** | IDOR Resume Disclosure via Generic File Download Route | **HIGH** | 7.5 | A01:2021 Broken Access Control | files.py |
| **VULN-05** | Privilege Escalation to Admin via Public Registration | **HIGH** | 7.2 | A01:2021 Broken Access Control | auth.py, auth_service.py |
| **VULN-06** | Unauthenticated User Profile & Private Email Exposure | **MEDIUM** | 5.3 | A01:2021 Broken Access Control | users.py |
| **VULN-07** | Missing HTTP Security Headers & Clickjacking Exposure | **MEDIUM** | 5.3 | A05:2021 Security Misconfiguration | main.py |
| **VULN-08** | WebSocket Message Payload Oversize / DoS Exposure | **MEDIUM** | 5.3 | A04:2021 Insecure Design | chat_ws.py |
| **VULN-09** | Regex Injection Exposure in File Association Search Query | **LOW** | 3.7 | A03:2021 Injection | files.py |

---

## Detailed Vulnerability Analysis

### VULN-01: Hardcoded Demo Authentication Backdoor in Password Reset
- **Severity**: CRITICAL (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H — 9.8)
- **OWASP**: A07:2021 – Identification and Authentication Failures
- **Location**:
  - backend/app/routers/auth.py (lines 148–151)
  - src/pages/ForgotPasswordPage.tsx (lines 57–61)
- **Vulnerability Description**:
  In reset_password, the backend contained explicit backdoor logic:
  token in ['mock_token_demo', 'mock-token-demo'] assigned the first seeker account.
  Any unauthenticated attacker on the Internet could send POST /api/auth/reset-password with token: 'mock_token_demo' and an arbitrary new password, immediately taking over the account of the first seeker in the database. Furthermore, the frontend ForgotPasswordPage.tsx contained an exposed button linking directly to /reset-password?token=mock_token_demo.
- **Remediation**:
  1. Remove all backdoor conditions ('mock_token_demo', 'mock-token-demo') from auth.py. Require valid, cryptographically generated tokens persisted in the database.
  2. Remove the backdoor link button from ForgotPasswordPage.tsx.

---

### VULN-02: Predictable Password Reset Token & Missing Expiration Lifecycle
- **Severity**: HIGH (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N — 7.5)
- **OWASP**: A07:2021 – Identification and Authentication Failures
- **Location**: backend/app/routers/auth.py
- **Vulnerability Description**:
  The reset token was generated using predictable user data (user ID and email prefix). An attacker who knows a target user's email and user ID could calculate the reset token without receiving the dispatch. Furthermore, there was no expiresAt timestamp, leaving reset tokens valid indefinitely until used.
- **Remediation**:
  1. Generate reset tokens using cryptographically secure random entropy (secrets.token_urlsafe(32)).
  2. Store a 15-minute expiration timestamp (resetTokenExpiresAt).
  3. Reject expired tokens with 400 Bad Request during reset_password.

---

### VULN-03: Reset Token Disclosure in API Response
- **Severity**: HIGH (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N — 7.5)
- **OWASP**: A01:2021 – Broken Access Control / Information Disclosure
- **Location**: backend/app/routers/auth.py
- **Vulnerability Description**:
  The POST /api/auth/forgot-password endpoint returned the token directly in the client-facing JSON response. In production, this exposes the reset token to anyone who requests a password reset for any known email address.
- **Remediation**:
  1. In production environments (ENVIRONMENT == 'production'), NEVER return or leak the token in HTTP responses.
  2. Return a generic message: 'If an account with this email exists, password reset instructions have been dispatched.'
  3. Ensure timing and response messages do not facilitate user email enumeration.

---

### VULN-04: IDOR Resume Disclosure via Generic File Download Route
- **Severity**: HIGH (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N — 7.5)
- **OWASP**: A01:2021 – Broken Access Control (Insecure Direct Object Reference)
- **Location**: backend/app/routers/files.py
- **Vulnerability Description**:
  In /api/files/{file_id}, any recruiter could download ANY seeker's private resume simply by knowing or enumerating the file_id, even if the candidate never applied to any job posted by that recruiter.
- **Remediation**:
  Harden the recruiter file download check in files.py: A recruiter can only download a seeker's resume if the seeker has submitted an active application to a job posted by that specific recruiter (or if caller is an admin or the file owner).

---

### VULN-05: Privilege Escalation to Admin via Public Registration
- **Severity**: HIGH (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H — 7.2)
- **OWASP**: A01:2021 – Broken Access Control
- **Location**: backend/app/services/auth_service.py
- **Vulnerability Description**:
  The RegisterData schema allowed role: Literal['seeker', 'recruiter', 'admin']. If a client sent role: 'admin' during POST /api/auth/register, the service created a user with role admin. In production, this allows arbitrary privilege escalation to administrator status.
- **Remediation**:
  Enforce that in production, self-registration with role='admin' is rejected with 403 Forbidden.

---

### VULN-06: Unauthenticated User Profile & Private Email Exposure
- **Severity**: MEDIUM (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N — 5.3)
- **OWASP**: A01:2021 – Broken Access Control
- **Location**: backend/app/routers/users.py
- **Vulnerability Description**:
  The GET /api/users/{user_id} route was completely unauthenticated and returned full UserProfile including private email addresses and internal ATS scores.
- **Remediation**:
  Require authentication on GET /api/users/{user_id} and restrict return of private fields (email, atsScore) to the owner or an admin.

---

### VULN-07: Missing HTTP Security Headers & Clickjacking Exposure
- **Severity**: MEDIUM (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N — 5.3)
- **OWASP**: A05:2021 – Security Misconfiguration
- **Location**: backend/app/main.py
- **Vulnerability Description**:
  The API did not send modern HTTP security headers, leaving responses vulnerable to MIME-sniffing, framing/clickjacking, and browser policy bypasses.
- **Remediation**:
  Implement middleware adding:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: geolocation=(), microphone=(), camera=()

---

### VULN-08: WebSocket Message Payload Oversize / DoS Exposure
- **Severity**: MEDIUM (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L — 5.3)
- **OWASP**: A04:2021 – Insecure Design
- **Location**: backend/app/websocket/chat_ws.py
- **Vulnerability Description**:
  receive_text() in the chat WebSocket loop had no maximum message payload length check. A client could send arbitrary multi-megabyte payloads, causing memory bloat and event-loop blocking.
- **Remediation**:
  Enforce a 64KB maximum payload constraint (len(text_data) <= 65536). Exceeding messages must be rejected with an explicit error packet.

---

### VULN-09: Regex Injection Exposure in File Association Search Query
- **Severity**: LOW (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N — 3.7)
- **OWASP**: A03:2021 – Injection
- **Location**: backend/app/routers/files.py
- **Vulnerability Description**:
  In download_file, checking chat attachment authorization used unescaped file_id in .
- **Remediation**:
  Wrap file_id in re.escape(file_id).

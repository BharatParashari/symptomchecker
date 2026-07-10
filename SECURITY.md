# Security Audit — 50-point checklist

Status of the AI Symptom Checker against the 50 common vulnerability classes.
Legend: **OK** = handled in code · **FIXED** = a real gap was found and fixed ·
**DEPLOY** = enforced via deployment config (see DEPLOYMENT.md) · **N/A** = not
applicable to this app's design.

| # | Issue | Status | How |
|---|-------|--------|-----|
| 1 | Exposed database credentials | OK | Only via `DATABASE_URL` env; `.env` git-ignored & docker-ignored |
| 2 | Public `.env` files | OK | `**/.env` in `.gitignore` and `.dockerignore`; only `.env.example` (no secrets) is committed |
| 3 | Hardcoded API keys | OK | No keys in source; all via env. Removed the old hardcoded Infermedica/JWT fallbacks |
| 4 | Weak / missing authentication | OK | JWT bearer auth; passwords bcrypt-hashed (12 rounds); `authenticate` middleware |
| 5 | No authorization checks | OK | `requireRole()` RBAC + per-record ownership checks |
| 6 | Users accessing others' data | OK | Appointments/chat scoped to `patient_id`/`doctor_id = req.user.id`; `/appointments/mine` uses the token id |
| 7 | Open DB read/write permissions | DEPLOY | App uses only parameterized queries; least-privilege DB role documented |
| 8 | Misconfigured Firebase/Supabase/S3 | N/A | None used — self-hosted Postgres/Mongo only |
| 9 | Admin routes unprotected | OK | `/api/auth/admin/*` require `authenticate` + `requireRole('admin')` |
| 10 | Debug pages in production | OK | No debug endpoints; behavior gated by `NODE_ENV` |
| 11 | Build logs leaking secrets | OK | Frontend build takes no secrets; `.dockerignore` excludes `.env` |
| 12 | Verbose errors leaking stack traces | FIXED | 5xx returns a generic message in production; stack only in non-prod |
| 13 | Leaked GitHub repo / commit history | OK | No secrets committed; push token never written to git config. **Rotate the PAT that appeared in chat** |
| 14 | Secrets in frontend JavaScript | OK | Frontend bundles no secrets; API is same-origin `/api` |
| 15 | Client-side-only security checks | OK | All authorization enforced server-side; frontend gating is UX only |
| 16 | Missing input validation | FIXED | Validated sex/age/evidence, email format, password length, id patterns |
| 17 | SQL injection | OK | All Postgres queries parameterized (`$1`, `$2`, …) |
| 18 | NoSQL injection | FIXED | Session/interview ids coerced to safe strings (blocks `{$ne:…}` operator injection); typed Mongoose schema |
| 19 | Cross-site scripting (XSS) | OK | React auto-escapes; no `dangerouslySetInnerHTML`; CSP header set |
| 20 | CSRF | OK | Bearer-token auth (no ambient cookies) → CSRF not applicable; CORS locked |
| 21 | Insecure file uploads | N/A | No upload endpoints (doctor license is a URL string) |
| 22 | Path traversal | OK | No user-controlled file paths; knowledge base loaded from a fixed path |
| 23 | SSRF | OK | Outbound calls (ABDM/ApiMedic) use fixed config base URLs, never user input |
| 24 | Broken password reset flows | N/A | No reset flow implemented (so none to exploit). Add a token-based flow if needed |
| 25 | Weak session management | OK | Stateless signed JWT, 7-day expiry, verified per request |
| 26 | JWT secret weak/leaked/reused | FIXED | No hardcoded fallback; prod refuses to boot without a ≥32-char secret |
| 27 | Overly permissive CORS | FIXED | Origin allow-list from `CLIENT_URL`; no wildcard; credentials scoped |
| 28 | Rate limits missing | FIXED | Global (300/15m) + strict auth (20 failed/15m) + diagnosis (40/5m); `trust proxy` set |
| 29 | Public test/staging environments | DEPLOY | Single production deploy; don't expose staging publicly |
| 30 | Default credentials unchanged | OK | No defaults; compose fails to start without `JWT_SECRET` and DB password |
| 31 | Webhooks without signature verification | N/A | No webhook endpoints |
| 32 | Payment checks only on frontend | N/A | No payment flows |
| 33 | Insecure direct object references (IDOR) | OK | Ownership enforced on chat/appointments; booking validates slot↔doctor and availability under `FOR UPDATE` |
| 34 | Endpoints trusting user-controlled IDs/roles | OK | Role comes from the verified JWT; ownership ids come from `req.user`, not the body |
| 35 | Logs containing tokens/passwords/PII | OK | No token/password logging; errors log message only; clients get generic 5xx |
| 36 | Source maps exposed in production | FIXED | `vite build` `sourcemap:false` + nginx returns 404 for any `.map` |
| 37 | Dependency vulnerabilities | OK | `npm audit`: 0 vulnerabilities (backend & frontend) |
| 38 | Outdated packages | OK | Current majors (React 18, Express 4, Mongoose 8, pg 8); 0 audit findings |
| 39 | Prompt injection in AI features | N/A | Diagnosis engine is a deterministic Bayesian model — no LLM prompt surface |
| 40 | AI tools accessing data without permission | N/A | Engine reads only the bundled knowledge base; it has no data-access actions |
| 41 | Excessive database permissions | DEPLOY | Least-privilege role snippet in DEPLOYMENT.md |
| 42 | No audit logs | PARTIAL | Doctor verification records `verified_by`/`verified_at`; broaden as needed |
| 43 | No monitoring / alerting | DEPLOY | `/api/health` endpoint for uptime checks; wire to your monitor |
| 44 | No backup / restore plan | DEPLOY | `pg_dump` steps + persistent volumes in DEPLOYMENT.md |
| 45 | Publicly exposed internal dashboards | OK | No internal dashboard; admin endpoints require the admin role |
| 46 | Missing security headers | FIXED | helmet on the API + security headers (CSP, X-Frame-Options, nosniff…) in nginx |
| 47 | Cookies missing HttpOnly/Secure/SameSite | N/A | No auth cookies — bearer token in the `Authorization` header (localStorage). Tradeoff noted below |
| 48 | Unencrypted sensitive data | OK/DEPLOY | Passwords bcrypt-hashed; TLS in transit via the reverse proxy; enable disk encryption at the host |
| 49 | Poor tenant isolation | OK | Per-user row scoping on every multi-user query |
| 50 | Over-trusting generated code without review | OK | This audit + engine tests + manual review of each change |

## Notes / residual tradeoffs

- **Token storage (item 47):** the frontend stores the JWT in `localStorage` and
  sends it as a bearer token. This avoids CSRF entirely but is readable by JS, so
  it depends on there being no XSS (there are no XSS sinks, and a CSP is set). If
  you prefer httpOnly cookies, that's a larger change (adds CSRF protection
  requirements) — happy to do it if you want that model.
- **Password reset (item 24):** not implemented. If you want it, it needs an email
  provider and a single-use, expiring, hashed reset token — I can add that.
- **PAT hygiene (item 13):** the GitHub token used for pushes appeared in chat.
  Rotate it after deployment.

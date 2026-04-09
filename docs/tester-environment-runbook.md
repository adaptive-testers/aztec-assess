# Tester Environment Runbook

This runbook defines how to launch and operate a controlled `tester` environment based on `staging`.

## 1) CI + Branch Protection

The repo CI workflow now runs on `main`, `staging`, and `tester` branches.

In GitHub branch protection rules, add a rule for `tester`:

- Require pull request before merging.
- Require status checks to pass (`backend`, `frontend`, `docker-build`, `security`).
- Restrict direct pushes (recommended).

## 2) Frontend (Cloudflare Pages)

Create a dedicated tester deployment target:

- Preferred: separate Pages project for tester.
- Alternate: same project with branch-specific environment config for `tester`.

Recommended DNS:

- `tester.aztecassess.app` -> tester frontend deployment

Tester frontend environment variables:

- Use `[frontend/.env.tester.example](../frontend/.env.tester.example)` as source of truth.
- Set `VITE_BASE_URL` to tester backend API.
- Set `VITE_TESTER_ONBOARDING_ENABLED=true`.
- Configure OAuth client IDs and redirect URI for tester domain.

## 3) Backend (Google Cloud Run)

Create a dedicated tester service and trigger:

- Service name example: `aztec-assess-tester-api`.
- Trigger source branch: `tester`.
- Use isolated secrets/config (do not reuse staging secret bundle directly).

Recommended DNS:

- `tester-api.aztecassess.app` -> tester Cloud Run service

Tester backend environment variables:

- Use `[backend/.env.tester.example](../backend/.env.tester.example)` as source of truth.
- Ensure `SIGNUP_ALLOWLIST_ENABLED=True`.
- Set `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` to tester domains.
- Configure OAuth redirect URIs to tester frontend domain.

## 4) Tester Database Isolation

Use a separate database/branch for tester traffic.

Requirements:

- Separate `DATABASE_URL` from staging.
- Run migrations against tester DB before invites.
- Keep backups/restore workflow documented for tester DB.

## 5) Controlled Signup (Allowlist)

Seed allowlist entries before sending tester invites.

Supported command:

```bash
cd backend
poetry run python manage.py seed_signup_allowlist \
  --from-file /path/to/tester_emails.txt \
  --role student \
  --notes "Spring tester cohort"
```

Command details:

- `--email` may be repeated and supports comma-separated values.
- `--role` supports `student`, `instructor`, or `both`.
- `--inactive` marks entries as inactive.
- `--from-file` accepts newline-delimited emails (`#` comments allowed).

## 6) Tester Onboarding UX

A lightweight, collapsible first-login checklist is included in `DashboardPage` and controlled by:

- `VITE_TESTER_ONBOARDING_ENABLED=true`

Checklist includes:

- Account setup confirmation
- One required flow
- One optional flow
- Feedback CTA (Google Form)

## 7) Go/No-Go Checklist

- `tester` branch pushes trigger CI.
- Frontend + backend tester URLs resolve with valid TLS.
- CORS/CSRF succeeds for tester frontend -> tester backend.
- Allowlisted signup succeeds.
- Non-allowlisted signup is blocked.
- Login/logout/token refresh works on tester domains.
- Instructor and student smoke flows pass.
- Monitoring/log access confirmed.
- Rollback run tested once.

## 8) Rollback

If tester deployment fails:

- Roll back frontend to previous successful tester deployment in Cloudflare Pages.
- Roll back backend Cloud Run revision to previous healthy revision.
- If data corruption risk exists, restore tester DB from latest safe backup/snapshot.
- Pause tester invites until go/no-go checks pass again.

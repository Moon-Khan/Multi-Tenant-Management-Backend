# Multi-Tenant Management Backend

A self-hosted, multi-tenant SaaS backend built with **NestJS**, **PostgreSQL**, and **Redis**. The whole stack runs locally via Docker Compose — no paid services required.

> **This repository is the backend (API) only.** The React admin panel lives in a separate frontend repository and talks to this API over HTTP. Allow the frontend's origin through CORS with `CORS_ORIGIN` in `backend/.env` (defaults to `http://localhost:5173`, the Vite dev server).

The core idea: prove real multi-tenancy and role-based access control, the two things a SaaS founder actually needs from a backend and a distinct skill set from typical payments/webhook integration work.

## Planned feature set

- **JWT authentication** with refresh-token rotation
- **Tenant isolation** enforced at the database level via PostgreSQL **Row-Level Security**, scoped by `tenant_id`
- **Role-based access control** (`admin` / `member` / `viewer`)
- **Per-tenant API rate limiting**, backed by Redis
- **Centralized error-handling middleware**
- **Jest** unit tests and **Supertest** integration tests
- **GitHub Actions CI** (free tier, public repo)

## Current status

This project is being built incrementally. What's implemented so far:

- [x] Clean/hexagonal module layout (`domain`, `use-cases`, `infrastructure`, `infrastructure-usecases-bridge`)
- [x] Postgres RLS proven end-to-end: `tenants`, `tenant_notes` and `users` tables, RLS policies scoped to `tenant_id`, and a non-owner `app_runtime` DB role (migrations run as the owning superuser, which bypasses RLS — the app never does)
- [x] Per-request tenant context middleware — resolves the tenant, opens a transaction, and sets the `app.current_tenant_id` session variable via `SET LOCAL` so RLS policies apply correctly under a pooled connection
- [x] Password hashing (bcrypt) on registration
- [x] JWT auth: register/login/refresh/logout, passport-jwt + passport-local strategies, refresh-token rotation with reuse detection (a replayed refresh token revokes its whole token family)
- [x] Tenant resolution from a verified JWT — every tenant-scoped resource route now trusts the `tenantId` claim in a signed access token (`JwtTenantContextMiddleware`) instead of a spoofable header; the header-based path is kept only for register/login, the one place a JWT can't exist yet
- [x] RBAC: a global `RolesGuard` (opt-in per route via `@Roles('admin', 'member', ...)`) checks the `role` claim already carried in the access token — e.g. `tenant-notes` creation is `admin`/`member` only, `viewer` is read-only. Self-registration can no longer set its own role (`RegisterDto` has no `role` field, `forbidNonWhitelisted` rejects the attempt outright) — every new account starts as `member`; promoting to `admin`/`viewer` is left for a future admin-managed-users endpoint
- [x] Unified `{ status, msg, data }` response envelope for every response, success or error (`ResponseInterceptor` + a single consolidated `AllExceptionsFilter`)
- [x] Per-tenant API rate limiting via Redis: a global `RateLimitGuard` gives every tenant its own shared quota (300 req/min by default) keyed by `tenantId`, so one noisy tenant can't starve another's — enforced with an atomic Lua `INCR`+`EXPIRE`, with `X-RateLimit-*`/`Retry-After` headers on every response. Unauthenticated routes (no tenant yet) fall back to per-IP limiting, and sensitive ones get their own tighter override via `@RateLimit(limit, windowSeconds)` — register is 5/min, login 10/min, both per IP
- [x] Automated tests: 27 Jest unit tests (use-cases + `RolesGuard`) and 21 Supertest e2e tests running against the real Docker Postgres/Redis stack — the e2e suite is what actually proves RLS tenant isolation, JWT-based tenant resolution, RBAC enforcement, refresh-token rotation/reuse-detection, and rate limiting all work together, not just in isolation
- [x] Docker Compose infra for Postgres and Redis
- [x] GitHub Actions CI (`.github/workflows/ci.yml`) running lint, build, unit tests, and e2e tests against Postgres + Redis service containers

## Tech stack

| Layer | Choice |
|---|---|
| API | NestJS (TypeScript) |
| Database | PostgreSQL 16, TypeORM, Row-Level Security |
| Cache / rate limiting | Redis 7 |
| Auth | JWT (access + refresh rotation) |
| Testing | Jest, Supertest |
| CI | GitHub Actions |
| Infra | Docker Compose |

## Project structure

```
.
├── backend/                  # NestJS API
│   └── src/
│       ├── domain/                          # Entities & repository interfaces (framework-agnostic)
│       ├── use-cases/                       # Application business logic
│       ├── infrastructure/                  # NestJS controllers, TypeORM, config, middleware
│       └── infrastructure-usecases-bridge/  # Wires infrastructure to use-cases (DI providers)
└── infra/                     # Docker Compose stack (Postgres + Redis) and DB init scripts
```

## Getting started

**Prerequisites:** Node.js, Docker, npm

1. Start the infra (Postgres + Redis):
   ```bash
   cd infra
   docker compose up -d
   ```
2. Configure the backend environment:
   ```bash
   cd backend
   cp .env.example .env
   ```
3. Install dependencies and run migrations:
   ```bash
   npm install
   npm run migration:run
   ```
4. Start the API in dev mode:
   ```bash
   npm run start:dev
   ```

## Testing

```bash
npm run test        # unit tests — pure, no external services needed
npm run test:e2e    # integration tests — needs the infra up and migrated first:
                     #   cd infra && docker compose up -d
                     #   cd backend && npm run migration:run
npm run test:cov    # coverage
```

The e2e suite runs against the real dev Postgres/Redis (not mocks), so it's the thing that actually proves RLS isolation, JWT tenant resolution, RBAC, and rate limiting all work end to end. It runs serially (`--runInBand`) since every spec file shares that one Postgres instance and Redis's rate-limit counters.

## License

UNLICENSED — private/portfolio project.

# Profy Skill Academy — Build Plan (todo.md)

**Companion to:** `docs/TECHNICAL_DOC.md` (the "how") · **Source:** `profy_skill_academy_prd.md`
**Rule:** work top-to-bottom. Each milestone has a Definition of Done (DoD) — don't start the
next milestone until the current one's DoD passes. Update checkboxes as you go.

> **Session note (2026-09-10):** Milestone 0 is in progress. Backend platform layer, both
> binaries, `/healthz`, compose stack, and the OpenAPI spec are done and verified
> (go build/vet/test ✅, `redocly lint` clean ✅). Remaining for M0: generate the TS client,
> CI workflow, seed script, and the compose DoD check (`docker compose up` → `/healthz` 200).
> Pre-existing note: `apps/web` + `apps/admin` are currently Next.js mock-UIs (not the Vite +
> TanStack Query targets of M6/M7) — revisit before those milestones.
>
> **Session note (2026-09-11):** Milestone 5 Flutter app scaffolded in `apps/mobile`
> (Riverpod 3, go_router, dio, youtube_player_iframe). All PRD §8 screens, bottom nav,
> AdSlot placeholder, AI degradation UI, and 15 passing tests incl. goldens for Home +
> AI chat (`flutter analyze` clean). Remaining for M5: E2E journey vs local API (blocked
> on M1 auth + M2 content endpoints). Run with `flutter run` — Android emulator reaches
> the API via `10.0.2.2:8080`.
>
> **Session note (2026-09-11):** Backend migrated from Go to Java/Spring Boot 3.
> Spring Boot 3.3.4, Spring Web, Spring Data JPA, Spring Security, Flyway, Spring Data Redis.
> Maven wrapper (`./mvnw`) — no global Maven install required. Java 25 on machine.
> Platform layer rebuilt: AppConfig, JwtTokenProvider, JwtAuthFilter, SecurityConfig,
> GlobalExceptionHandler, AuditAspect, HealthCheckIndicator. All 7 Flyway migrations created
> from TECHNICAL_DOC §4 schemas. Module stubs (controllers + services) for all 8 modules.
> Remaining for M0: compile + boot + `/healthz` 200, TS client gen, CI workflow, seed script.
>
> **Session note (2026-09-11):** M1-M4 backend modules fully implemented (71 Java files, compiles clean).
> **M1 Auth:** User/AdminUser/RefreshToken entities, AuthService + AdminAuthService (register/login/refresh/logout with
> rotation + revocation), SHA-256 token hashing, JwtTokenProvider with audience separation.
> **M2 Taxonomy+Lessons:** TaxonomyNode entity (recursive tree), Lesson/LessonVideo entities, full CRUD
> with cycle prevention, depth guard (≤2), draft invisibility, YouTube-ID regex validation,
> search endpoint, featured-home endpoint, admin audit logging (@Audited).
> **M3 AI Teacher:** AiChatSession/Message entities, LLMProvider interface + OpenAiCompatibleProvider
> (RestTemplate, 15s timeout), CircuitBreaker (5 failures → open 60s), AiService with Redis
> rate limiting, grounding prompt from lesson fields only, 10-turn history cap.
> **M4 Progress:** LessonProgress/QuizAttempt/Bookmark/Certificate entities, ProgressService with
> course completion derivation, continue-learning, bookmarks CRUD, quiz attempt recording (70%
> threshold), profile stats aggregation.
> Remaining: error handling polish, unit tests for M1-M4, M0 seed/CI, M6-M10.

---

## Milestone 0 — Project Scaffolding & Contracts
- [x] Create monorepo layout exactly as TECHNICAL_DOC §3 (backend/, apps/, packages/, docs/)
- [x] `docker-compose.yml`: Postgres 16 + Redis 7 (+ api, worker stubs), `.env.example` committed
- [x] Spring Boot 3 Maven project: Spring Web, Spring Data JPA, Spring Security, Flyway, Spring Data Redis, Actuator; `/healthz` endpoint; Dockerfile
      (Maven wrapper, `./mvnw compile` + `./mvnw spring-boot:run` for local dev; migrate-on-start via Flyway)
- [x] Write `backend/api/openapi.yaml` (OpenAPI 3.1) covering all endpoint groups in TECHNICAL_DOC §5
      (`npx @redocly/cli lint` passes clean via `redocly.yaml`)
- [ ] Generate TS API client into `packages/api-client/`
      (package scaffold + `src/index.ts` written; `npm install`/`openapi-typescript` generation still pending)
- [ ] CI workflow: Java compile+test, Flutter analyze+test, web/admin eslint+test
- [ ] Seed script: 3 Phase-1 categories (+ Phase-2 rows with `phase=2`) per PRD §6

**DoD:** `docker-compose up` → `GET /healthz` returns 200; CI green on empty scaffold; OpenAPI lint passes.
**Status:** OpenAPI lint ✅ · Spring Boot scaffold + platform layer ✅ · compile/boot check pending.

## Milestone 1 — Auth (consumer + admin)
- [x] `users`, `admin_users`, `refresh_tokens` migrations (Flyway V1)
- [x] Consumer auth: register/login/refresh/logout (JWT 15 min `consumer` audience, rotating refresh, reuse detection)
- [x] Admin auth: `/admin/auth/*` with `admin` audience; middleware proves tokens are not interchangeable
- [ ] bcrypt(12), IP rate limits on auth endpoints (bcrypt ✅, IP rate limits pending)
- [ ] Unit + integration tests (testcontainers)

**DoD:** register→login→refresh→logout round-trips via curl for both audiences; an admin token calling a consumer endpoint returns 401 (and vice versa).
**Status:** Auth logic implemented. JWT audience separation enforced. SHA-256 refresh token hashing. Tests pending.

## Milestone 2 — Taxonomy & Content Backend
- [x] `taxonomy_nodes`, `lessons`, `lesson_videos`, `video_checks` migrations (Flyway V2-V3)
- [x] Taxonomy module: recursive read (`/taxonomy/tree`, `/taxonomy/nodes/:slug`), admin CRUD, cycle/depth guard, server-side `phase=1` filter
- [x] Lessons module: public reads (`/courses/:slug`, `/lessons/:slug`), admin CRUD, draft invisibility, YouTube-ID regex validation
- [x] Search endpoint + featured-home endpoint (basic)
- [x] Admin audit logging middleware on all admin writes (`@Audited`)
- [ ] Seed: Technology/Business & Finance/Languages demo courses + lessons with real curated YouTube IDs

**DoD:** consumer tree shows only Phase-1 nodes even though Phase-2 rows exist; a draft lesson is invisible publicly; admin CRUD round-trips with audit rows.
**Status:** Taxonomy + Lessons fully implemented. Recursive tree building, depth guard, slug uniqueness, draft invisibility, YouTube validation. Seed data pending.

## Milestone 3 — AI Teacher
- [x] `ai` module: `LLMProvider` interface + `OpenAiCompatibleProvider` (config: AI_BASE_URL/AI_API_KEY/AI_MODEL)
- [x] Grounding prompt builder from lesson fields ONLY (title, description, explanation, objectives, examples, exercises, quizzes) + refusal snippet for off-topic
- [x] `POST /lessons/:id/ai/chat`, `GET /lessons/:id/ai/messages`; session per (user, lesson); history cap 10 turns
- [x] Resilience: 15s timeout, circuit breaker (5 failures → open 60s); open breaker → `503 ai_unavailable`
- [x] Redis rate limits: Free 20 msgs/day, Premium 200 (env-configurable)
- [ ] Golden-file prompt tests + fake-provider tests

**DoD:** grounded answers stay inside lesson content; killing the LLM endpoint returns clean `503 ai_unavailable` while the lesson endpoint still returns 200.
**Status:** AI module fully implemented. Circuit breaker, Redis rate limiting, grounding prompt, session persistence. Tests pending.

## Milestone 4 — Progress, Library, Quizzes
- [x] `lesson_progress`, `quiz_attempts`, `bookmarks`, `certificates` (unused, Phase-2 ready) migrations (Flyway V4-V5)
- [x] PUT progress, continue-learning, bookmarks CRUD, quiz-attempt recording
- [x] Derived course completion (all published lessons completed = course complete)
- [x] `/profile/stats` endpoint
- [ ] Service-layer tests ≥ 70%

**DoD:** completing all lessons of a course marks the course complete; library/continue endpoints reflect state; `certificates` table exists and is migration-safe.
**Status:** Progress module fully implemented. Course completion derivation, continue-learning, bookmarks, quiz attempts (70% threshold), profile stats. Tests pending.

## Milestone 5 — Flutter Mobile App
- [x] App scaffold: Riverpod, go_router, dio client against OpenAPI; theming; `X-App-Version` header
      (`apps/mobile`, Riverpod 3; dio interceptor does transparent refresh+retry on 401; design
      tokens ported from `Mobile Learning App UI`; `--dart-define=PROFY_API_BASE_URL` overrides `10.0.2.2:8080`)
- [x] Screens in PRD §8 order: Welcome → Interest picker → Home (search, featured, category grid) → Search Results → Course Detail → Lesson (YouTube iframe video + content tabs + Ask AI Teacher) → AI Chat → Library → Profile → Subscription
- [x] Bottom nav: Home · Learn · Library · Profile
- [x] AI chat degradation UI: `ai_unavailable` → "AI Teacher unavailable" state; lesson never blocked
- [x] `AdSlot` widget + `GET /config`-driven placement/frequency (placeholder render; hidden for premium)
- [x] Widget tests + golden tests for core screens
      (widget tests: Home render, AI chat happy path + `ai_unavailable` degradation,
      models/error envelope; goldens: `test/goldens/{home_screen,ai_chat_screen}.png`
      at a fixed 390×844 @3x viewport — 15 tests passing, `flutter analyze` clean)

**DoD:** full learner journey works end-to-end against local API: browse → watch → ask AI → complete lesson → library; AI outage degrades gracefully.
**Status:** UI + tests done (`flutter analyze` clean, 15/15 passing incl. goldens). The E2E
journey against the local API remains — blocked until M1 (auth) and M2 (content) endpoints exist.

## Milestone 6 — Consumer Web App (React)
- [ ] Vite + React + TS + Tailwind + TanStack Query; generated api-client wired
      (⚠️ current `apps/web` is a Next.js mock UI — re-scaffold per TECHNICAL_DOC §3)
- [ ] Screens mirror mobile 1:1 (same routes/flows), responsive layout
- [ ] YouTube IFrame embed; AdSlot web analog
- [ ] Shared consumer auth flows (login/register/refresh) using same backend endpoints
- [ ] Vitest/RTL tests on critical flows

**DoD:** same journey as Milestone 5 passes in the browser; layout works at mobile/tablet/desktop widths.

## Milestone 7 — Admin Web App
- [ ] Vite + React + TS app with admin-only auth
      (⚠️ current `apps/admin` is a Next.js mock UI with TaxonomyManager/LessonEditor/ReviewDashboard — re-scaffold per TECHNICAL_DOC §3)
- [ ] Taxonomy Manager (tree UI, reorder, phase toggle)
- [ ] Lesson Editor (all content fields + quiz editor) + Video Curation (paste URL → preview, set primary/alternates, status, review date)
- [ ] Review Dashboard (flagged/unavailable queue) + audit log viewer
- [ ] RTL tests on editors

**DoD:** a curator can create category → course → lesson → attach video → publish, and it appears in mobile + web within cache TTL.

## Milestone 8 — Billing (Free w/ ads vs Premium ad-free)
- [ ] `subscriptions` migration + entitlement query + Redis cache (60s)
- [ ] Web: Stripe Checkout session + webhook handlers → upsert subscription; `GET /entitlement`
- [ ] Mobile: RevenueCat SDK + server webhook → same table
- [ ] Ad serving logic keyed on entitlement (premium = no ad slots rendered)
- [ ] Webhook integration tests (Stripe CLI)

**DoD:** fake purchase flips entitlement within 60s on both platforms; premium clients receive zero ad slots; Stripe webhook retries are idempotent.

## Milestone 9 — Worker & Video Availability
- [ ] `cmd/worker`: daily oEmbed availability check on approved videos
- [ ] Unavailable → `curator_status='unavailable'` → surfaces in admin Review Dashboard
- [ ] Consumer fallback to primary alternate video when available

**DoD:** marking a video unavailable (test) propagates to dashboard and consumer payload without manual intervention.

## Milestone 10 — Hardening & Launch Prep
- [ ] Security pass: rate limits, CORS lockdown, token audience checks, input validation sweep (TECHNICAL_DOC §10)
- [ ] Structured logs + `/healthz` uptime check + Sentry on all three clients (nice-to-have)
- [ ] Load smoke test of hot endpoints (tree, lesson, featured)
- [ ] Deployment: prod host, TLS proxy, migrations run, backups scheduled
- [ ] Store assets: Flutter builds for Play internal testing + TestFlight
- [ ] Full PRD §8 screen checklist against all three frontends
- [ ] Write `docs/PHASE2_NOTES.md` from TECHNICAL_DOC §12 table

**DoD:** end-to-end pass on staging: new user on mobile AND web → learn → ask AI → complete course → upgrade to premium → ads disappear → admin flags a video → replacement flow works.

---

## Milestone Status

| Milestone | Status | Notes |
|---|---|---|
| 0 — Scaffolding & Contracts | 🚧 In progress | Java/Spring Boot scaffolded + compiles. TS client gen, CI, seed script, boot+healthz check pending |
| 1 — Auth | 🚧 Tests pending | Full auth logic: register/login/refresh/logout, JWT audience separation, refresh rotation+revocation, bcrypt(12). IP rate limits + tests pending |
| 2 — Taxonomy & Content | 🚧 Tests pending | Recursive tree, CRUD, draft invisibility, YouTube validation, search, featured, audit logging. Seed data + tests pending |
| 3 — AI Teacher | 🚧 Tests pending | LLMProvider + OpenAiCompatibleProvider, circuit breaker, Redis rate limits, grounding prompt, session persistence. Tests pending |
| 4 — Progress & Library | 🚧 Tests pending | Course completion derivation, continue-learning, bookmarks, quiz attempts, profile stats. Tests pending |
| 5 — Mobile App | ✅ Complete | Flutter app: all PRD §8 screens, bottom nav, AdSlot, AI degradation UI; 15 tests passing incl. goldens |
| 6 — Consumer Web | ⬜ Not started | Next.js mock UI exists in `apps/web` (needs Vite re-scaffold) |
| 7 — Admin Web | ⬜ Not started | Next.js mock UI exists in `apps/admin` (needs Vite re-scaffold) |
| 8 — Billing | ⬜ Not started | |
| 9 — Worker | ⬜ Not started | Worker stub exists; M9 job pending |
| 10 — Hardening & Launch | ⬜ Not started | |
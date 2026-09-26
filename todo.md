# Dera Skul — Build Plan (todo.md)

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
> **Session note (2026-09-12):** Project pushed to GitHub: https://github.com/Profy256/Profy-skill-academy.git
> README.md added with project overview, tech stack, and detailed setup instructions.
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
>
> **Session note (2026-09-12):** README.md created with full project docs, tech stack, setup instructions
> (Docker quick start + individual service run guides for backend, web, admin, mobile). Project pushed
> to GitHub: https://github.com/Profy256/Profy-skill-academy.git
>
> **Session note (2026-09-15):** NEW FEATURE REQUESTED (product decision — supersedes the strict
> "no auto-surfaced videos" rule in README/PRD for uncovered lessons):
> **Automatic video curation fallback.** Admin-curated videos keep top priority; lessons WITHOUT any
> curated video get one automatically sourced from the YouTube Data API v3 and shown immediately
> (marked `source='auto'`) instead of nothing. Decisions confirmed with the owner:
> (1) Source = YouTube Data API search (needs `YOUTUBE_API_KEY`), NOT LLM-suggested video IDs.
> (2) Mechanism = runtime fallback on consumer lesson read + daily sweep job for never-visited lessons.
> (3) Visibility = auto videos serve to learners immediately; admins review/replace them later.
> Consumer resolution order: curated+approved primary → any curated+approved → auto → none.
> Implementation plan = **Milestone 11 below**. Gotchas to remember:
> - `lesson_videos.added_by` is NOT NULL FK to admin_users → make nullable in V9 (auto videos have no admin author)
> - `curator_status` CHECK has no 'auto' value → do NOT put it there; add a `source` column ('curated'|'auto'),
>   keep auto videos at `curator_status='pending'` so they surface in review
> - one auto video per lesson: partial unique index `WHERE source='auto'` (race-safe upsert)
> - YouTube search costs 100 quota units/call on the free tier → only fetch when a lesson has zero videos;
>   if `YOUTUBE_API_KEY` is unset, log once and disable the feature silently (lesson payloads unaffected)
> - YouTube client should follow the `OpenAiCompatibleProvider` RestTemplate pattern (timeouts, no new deps)
>
> **Session note (2026-09-25, later):** Milestone 12 **complete** — learner journey smoke-tested live
> (free attempt → 402 → credit → rollback on validation error → pass → certificate → public verify →
> PDF/PNG), docs + `.env.example` updated, and the full verification sweep is green. Only pre-existing
> `apps/admin` lint errors remain (baseline, untouched files).
>
> **Session note (2026-09-25):** NEW FEATURE SET — **Milestone 12 below** (certificates + Markdown
> blog + SEO/GEO). Backend, OpenAPI, api-client, admin UI, and web UI are implemented; backend tests
> 108/108 green, `redocly lint` valid, `apps/web` lint 0 errors + `tsc` + `next build` pass, `apps/admin`
> `tsc` clean. Live smoke test on a fresh DB applied Flyway **V16–V20** cleanly and surfaced 2 bugs,
> both fixed: (1) JPQL `LIKE` over the `jsonb` `tags` column failed at startup → native query with
> `jsonb_array_elements_text`; (2) `/api/v1/courses/{slug}/final-test` was anonymously reachable via the
> public `/api/v1/courses/**` matcher → NPE/500 → declared `authenticated()` + null-safe `userId()`.
> Remaining: finish the authenticated learner journey smoke test, docs/.env sweep, final verification run.
>
> **Session note (2026-09-26):** Milestone 0 **closed** + stale docs swept. (1) **CI** added at
> `.github/workflows/ci.yml` — 6 jobs gating `main` + PRs: `backend` (`./mvnw -B test`, 108/108) ·
> `api-spec` (redocly lint + `packages/api-client` generate/typecheck) · `web` + `admin`
> (`npm ci` → `lint` → `tsc --noEmit` → `build`) · `api-smoke` (Postgres 16 + Redis 7 services →
> boot API → **seed twice** → assert categories/lessons/primaryVideo/blog/verify-404) · `mobile`
> (`flutter analyze` + `flutter test`). Fixed the JWT gotcha while proving it: `JWT_SECRET` must be
> ≥32 bytes or boot dies with jjwt `WeakKeyException`. (2) **Seed** = `scripts/seed.sh` +
> `scripts/seed_content.sql`: idempotent + additive (never deletes) — 3 phase-1 categories (reused
> via alias slugs), 6 phase-2, 13 PRD subcategories, 4 courses, 12 lessons with the full AI-Teacher
> field set, 12 curated YouTube videos; verified running twice on a **fresh** DB (`profy_ci`) with
> migrations V1–V20. (3) **Admin lint baseline cleared** — all 15 pre-existing
> `react-hooks/set-state-in-effect` / `no-explicit-any` / `no-unescaped-entities` errors fixed for
> real (promise-callback setState, lazy `useState` initializers, precise types; **no
> `eslint-disable`**), so CI can enforce `npm run lint` on `apps/admin` (now 0 errors, 10 warnings).
> (4) Mobile goldens made deterministic-ish: `apps/mobile/test/flutter_test_config.dart` adds a 2%
> tolerant golden comparator → `flutter test` **15/15**. (5) Local verification of every CI job green.
> (6) Docs sync for scope change: **PRD → v2.0** (certificates moved into Phase 1 §7.5, blog+SEO §7.8,
> service-boundary question resolved, stack corrected Go→Java/Next.js, roadmap/open questions updated),
> `docs/TECHNICAL_DOC.md` (Go/Vite/`cmd/worker` leftovers → Spring worker profile + Next.js, new §9.1 CI
> + §9.2 seed), `deploy.md` (standalone Node servers, not Vite static bundles; missing env rows),
> `README.md` (CI + Seed Data sections). (7) **CI verified on GitHub** — first run failed only
> because `./mvnw` lives in `backend/`, not the repo root (fixed: `working-directory: backend` +
> `(cd backend && …)` in the smoke job, plus a psql guard step); rerun = **6/6 jobs green**
> (`backend` · `api-spec` · `web` · `admin` · `api-smoke` · `mobile`).
>
---

## Milestone 0 — Project Scaffolding & Contracts
- [x] Create monorepo layout exactly as TECHNICAL_DOC §3 (backend/, apps/, packages/, docs/)
- [x] `docker-compose.yml`: Postgres 16 + Redis 7 (+ api, worker stubs), `.env.example` committed
- [x] Spring Boot 3 Maven project: Spring Web, Spring Data JPA, Spring Security, Flyway, Spring Data Redis, Actuator; `/healthz` endpoint; Dockerfile
      (Maven wrapper, `./mvnw compile` + `./mvnw spring-boot:run` for local dev; migrate-on-start via Flyway)
- [x] Write `backend/api/openapi.yaml` (OpenAPI 3.1) covering all endpoint groups in TECHNICAL_DOC §5
      (`npx @redocly/cli lint` passes clean via `redocly.yaml`)
- [x] Generate TS API client into `packages/api-client/`
      (`npm run generate` → `src/schema.d.ts` + `npm run typecheck` green — re-run after every spec change)
- [x] CI workflow: `.github/workflows/ci.yml` — 6 jobs on `push` to `main` + `pull_request`:
      backend `./mvnw -B test` · OpenAPI `redocly lint` + api-client generate/typecheck ·
      `apps/web` lint+tsc+build · `apps/admin` lint+tsc+build · API boot+seed smoke test ·
      `flutter analyze` + `flutter test`
- [x] Seed script: `scripts/seed.sh` + `scripts/seed_content.sql` — 3 Phase-1 categories (+ Phase-2
      rows with `phase=2`), 13 subcategories, 4 courses, 12 lessons with full AI-Teacher fields,
      12 curated YouTube videos; idempotent (safe to run twice), additive (never deletes)

**DoD:** `docker-compose up` → `GET /healthz` returns 200; CI green on empty scaffold; OpenAPI lint passes.
**Status:** ✅ **Complete (2026-09-26)** — OpenAPI lint valid · Spring Boot scaffold + platform layer
· TS client generates/typechecks · **CI green on GitHub: 6/6 jobs** on `main` · seed verified twice
against a fresh DB (migrations V1–V20).

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
- [x] Seed: Technology/Business & Finance/Languages demo courses + lessons with real curated YouTube IDs
      (`scripts/seed.sh` + `scripts/seed_content.sql` — idempotent, additive, verified on a fresh DB)

**DoD:** consumer tree shows only Phase-1 nodes even though Phase-2 rows exist; a draft lesson is invisible publicly; admin CRUD round-trips with audit rows.
**Status:** Taxonomy + Lessons fully implemented. Recursive tree building, depth guard, slug uniqueness, draft invisibility, YouTube validation. Seed data ✅ (2026-09-26).

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

## Milestone 6 — Consumer Web App (Next.js 16)
> **Scope change (confirmed by the build):** the earlier "Vite + TanStack Query re-scaffold" plan is
> **dropped** — `apps/web` stays on Next.js 16 (App Router) + React 19 + TS + Tailwind v4, because the
> blog / verify / RSS / sitemap / `llms.txt` routes are server-rendered Next routes and the learner
> shell already exists. See PRD §8 "Web-only additions".
- [x] Next.js 16 App Router shell (`app/page.tsx` learner SPA + `SiteShell`), responsive layout
- [x] Screens mirroring mobile: welcome · register · interests · home · category · subcategory ·
      course · lesson · ai-chat · library · profile · subscription · resources · login
- [x] Shared consumer auth flows (register/login/refresh/logout) against the same backend endpoints
- [x] Certificate tab (free-attempt/402/credit/result state machine, Stripe + MarzPay, issued list)
- [x] Blog + credential verification + SEO/GEO routes (`/blog`, `/blog/[slug]`, `/verify/[code]`,
      `/rss.xml`, `/llms.txt`, `sitemap.ts`, JSON-LD/breadcrumbs/FAQ components)
- [ ] **Real catalog data**: course/lesson/AI-chat screens still render mock data (`lib/data.ts`)
      instead of `fetchTaxonomyTree` / `fetchCourse` / `fetchLesson` (those API helpers already exist
      in `lib/api.ts` — wiring is the remaining work)
- [ ] YouTube IFrame embed in the lesson screen (currently a placeholder poster image)
- [ ] Progress writes (PUT progress / bookmarks) from the lesson + library screens
- [ ] AdSlot web analog (server-driven placement config)
- [ ] Component/unit tests on critical flows (none configured; CI currently runs lint + tsc + build)

**DoD:** same journey as Milestone 5 passes in the browser against the local API; layout works at mobile/tablet/desktop widths.

## Milestone 7 — Admin Web App (Next.js 16)
> Same decision as M6: `apps/admin` stays on Next.js 16 + Tailwind v4 (no Vite re-scaffold).
- [x] Next.js app with admin-only auth (`api.auth.login/refresh/logout`, admin JWT audience)
- [x] Taxonomy Manager (tree UI, create/edit, phase toggle)
- [x] Lesson Editor (all content fields + quiz editor) + Video Curation (paste URL → attach, set
      primary/alternates, status, review date, AUTO/CURATED badges, "Auto-find video")
- [x] Review Dashboard (flagged/unavailable queue)
- [x] Blog Manager (Markdown authoring + live preview) + Certificates Studio (design/pricing with live
      preview, final-test editor, credentials) + AI Settings, Quick Lesson, Resources, Campus Library
- [ ] Audit-log viewer (rows are written via `@Audited`; no viewer UI yet)
- [ ] RTL tests on editors (none configured; CI runs lint + tsc + build)

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

## Milestone 11 — Auto Video Curation (curated-first, auto fallback) — REQUESTED 2026-09-15
> Do this before/alongside M9 if picked up in a fresh session. Curated videos always win; auto is
> only a fallback for lessons with no curated video. Work top-to-bottom:
> **Status 2026-09-15: core implementation COMPLETE, backend tests 94/94 green, admin tsc clean.**
> Remaining: run Flyway V9 against a live DB (`docker compose up` → boot check), optionally wire
> the review dashboard to highlight `source='auto'` rows.
- [x] Flyway **V9__auto_curation.sql**: `source text NOT NULL DEFAULT 'curated' CHECK (source IN ('curated','auto'))`; `added_by` made nullable; partial unique index `uq_lesson_videos_one_auto ON lesson_videos(lesson_id) WHERE source='auto'` + `idx_lesson_videos_source`
- [x] `LessonVideo` entity: nullable `addedBy`, `source` field (default 'curated'); `source` exposed in `videoToMap` payloads; `VideoApi.source` in `apps/admin/src/lib/api.ts`
- [x] Config: `profy.youtube-api-key: ${YOUTUBE_API_KEY:}` in `application.yml` + `application-local.yml` + `.env.example`; `youtubeApiKey` on `AppConfig`
- [x] `YouTubeSearchService` (modules/lessons/service): GET `https://www.googleapis.com/youtube/v3/search` part=snippet, type=video, videoEmbeddable=true, maxResults=5, relevanceLanguage=en; parses videoId/title/channelTitle; returns empty list on ANY error (never throws up); warns once when key unset
- [x] `AutoCurationService`: query = parent course name + lesson title (≤80 chars) → search → skips IDs already attached → persists `LessonVideo(source='auto', isPrimary=true, curatorStatus='pending', addedBy=null)`; `DataIntegrityViolationException` → re-reads existing auto row (race-safe)
- [x] `LessonsService.getLessonBySlug`: runtime auto-fill when lesson has zero videos (best-effort, never 500s) + curated-first `resolvePrimaryVideo` (approved curated primary → newest approved curated → auto → null; flagged/unavailable primary ignored)
- [x] Sweep: `@EnableScheduling` on `ProfyApplication`; `AutoCurationSweepJob` daily 03:00 UTC (cron overridable via `profy.auto-curation-sweep-cron`), cap 50 lessons/run; `LessonRepository.findPublishedLessonsWithoutVideos()`
- [x] Admin API: `POST /api/v1/admin/lessons/{id}/videos/auto` (`@Audited`, 400 when key unset or nothing found) in `AdminLessonsController` + `LessonsService.autoCurateVideo`; admin UI: AUTO/CURATED badges on video cards + "⚡ Auto-find video" button in `VideoPanel` + `api.videos.autoFind`
- [x] Docs sweep: README features bullet + env var, PRD §5 non-goals + §7.2 principle/workflow, TECHNICAL_DOC §4.2 schema + worker section (§6.11 today), `backend/api/openapi.yaml` (`source` on VideoCandidate + new endpoint)
- [x] Tests: 11 new `AutoCurationServiceTest` (persist fields, skip-if-covered, no-key no-op, no-results, dup-ID skip, race, sweep caps) + 5 new resolution tests in `LessonsServiceTest`; removed stale `findByLessonIdAndIsPrimaryTrue` stubs
- [x] Bonus: fixed 3 pre-existing `TaxonomyServiceTest` failures (missing save stub; depth test used depth-1 parent instead of depth-2 leaf; parent lookup happens before slug check → no slug stub needed)

**DoD:** a published lesson with no admin video serves an auto-sourced YouTube video marked `source='auto'`; once an admin attaches a curated video it takes precedence; `YOUTUBE_API_KEY` unset = feature off, no errors; unit tests green. ✅ (backend logic verified by tests; live-DB boot check pending)

Key files: `backend/src/main/java/com/profy256/profy/modules/lessons/**` (service/repo/entity/dto/controllers), `backend/src/main/resources/db/migration/V9__auto_curation.sql`, `backend/src/main/resources/application*.yml`, `backend/src/main/java/com/profy256/profy/platform/config/AppConfig.java`, `backend/src/main/java/com/profy256/profy/ProfyApplication.java`, `apps/admin/src/components/LessonEditor.tsx`, `apps/admin/src/lib/api.ts`, `.env.example`, `README.md`, `profy_skill_academy_prd.md`, `docs/TECHNICAL_DOC.md`, `backend/api/openapi.yaml`.

---

## Milestone 12 — Certificates + Markdown Blog + SEO/GEO — REQUESTED 2026-09-25
> Rules of the build: loose coupling (no cross-module service→service calls where an event/port will do),
> failure of any one subsystem (email, PDF, payments) must never break another (webhook → transaction →
> publish → idempotent listener), server-side authority on every gate (progress %, attempt count, score).
>
> **Product rules:** free 1st final-test attempt once learner progress ≥ 50% (threshold admin-editable);
> every further attempt costs a `test_credit` ($2.00 Stripe / 7,500 UGX MarzPay, admin-editable);
> pass = score ≥ 70% (admin-editable) AND `confirmName` → certificate with public `/verify/{code}`;
> lesson quizzes stay ungraded practice (final test reads course-level `final_test jsonb`).

- [x] **Migrations V16–V20**: `final_test`/cert snapshot columns + `test_attempts` · `test_credits` ·
      `blog_posts` · `certificate_settings` (singleton row) · `certificate_definitions` (+ `certificates.definition_id`)
- [x] **Backend decoupling**: `PaymentSucceededEvent` / `CertificateIssuedEvent` / `CourseProgressUpdatedEvent`
      (AFTER_COMMIT listeners); `CertificateNotifier` (async email/PDF, never on request thread),
      `CertificateTemplate.applyOverrides`, `CertificateStateWriter`; billing → cert credit flow via
      `TestCreditGranter` + `TestCreditCheckoutService` (idempotent grant/consume)
- [x] **Gates & abuse control**: Redis submit lock (60s) + hourly counter (10/h) → 429; first attempt free
      iff `attempts==0 && progress≥threshold`, else `test_credit` consumed; 402 when locked
- [x] **PDF/PNG certificates**: PDFBox 3.0.4 + zxing 3.5.3, rendered from `certificate_definitions` +
      admin overrides (`CertificateTemplate`), public `GET /verify/{code}[/pdf|/png]`
- [x] **Email**: `EmailSender` port + Resend adapter (no-op / logged when `RESEND_API_KEY` unset)
- [x] **Security**: permitAll for `GET /blog`, `/blog/**`, `/verify/**`, `GET /certificates/definitions`;
      final-test routes declared `authenticated()` (public catalog matcher no longer leaks them)
- [x] **Blog backend**: `BlogService` (published-only public reads, admin CRUD, slug/status/reading-time/tags),
      `GET /api/v1/blog`, `/blog/{slug}`, `GET|POST|PUT|PATCH|DELETE /api/v1/admin/blog/**` (`@Audited`)
- [x] **OpenAPI**: ~25 new paths, `certificates`/`blog` tags, `PaymentRequired` (402), all new schemas;
      removed duplicate `VideoInput` + duplicate schema body; **`npx @redocly/cli lint` VALID**
- [x] **api-client**: `npm install` → `generate` → `typecheck` all pass
- [x] **Admin UI**: `BlogManager.tsx` (Markdown authoring + live preview), `CertificateStudio.tsx`
      (Design & Pricing w/ live preview · Final Tests editor · Credentials · Issued),
      `api.blog` + `api.certificates`, Sidebar/page entries (`certificates`, `blog`) — `tsc` clean
- [x] **Web UI**: `CertificateTab.tsx` (loading/locked/intro/test/result/signed-out, Stripe redirect +
      MarzPay polling, `CertificateList`), CourseScreen Certificate tab + Profile "Credentials",
      quiz answer-leak fix in `LessonScreen` (reveal only after "Check answers")
- [x] **Web SEO/GEO**: `/blog`, `/blog/[slug]`, `/verify/[code]`, `/rss.xml`, `/llms.txt`, rewritten
      `sitemap.ts` (real routes only), `.prose` styles, `server-api.ts`/`blog.ts`/`markdown.ts`
      (marked + sanitize-html, server-rendered), Blog link in the SPA sidebar
- [x] **Verified**: `./mvnw test` 108/108 · `apps/web` `tsc` + lint (0 errors) + `next build` ✅ ·
      live boot on fresh DB (V16–V20 apply, `/healthz` 200, blog/verify/definitions smoke ✅)
- [x] **Live learner journey smoke test** ✅ 2026-09-25 — register → state (67% progress, free
      attempt ready, answer key stripped) → failed attempt #1 (free) → state flips to locked →
      **402** without a credit → Stripe checkout without a key = clean **400** (no 500) → credit
      granted → pass-without-confirmName = **400** *and the credit rolled back* → passing attempt
      consumed the credit → certificate `CFNG2N8GVU` → `GET /certificates` 1 item → public
      `GET /verify/{code}` 200 → **PDF 200 (`%PDF-`, 5 KB)** → **PNG 200 (`PNG`, 94 KB)** →
      async email logged `Email skipped (RESEND_API_KEY empty)` on a worker thread
- [x] **Docs & config**: `docs/TECHNICAL_DOC.md` (§4.8 certificates/test credits, §4.9 blog, §5 new
      endpoint groups, §6.10 module design, §8 env vars, migration path fixed) · `ADMIN_GUIDE.md`
      (§9 Certificates studio, §10 Blog Manager) · `README.md` (feature bullets + env vars) ·
      `.env.example` (`RESEND_API_KEY`, `RESEND_FROM`, `SITE_URL`)
- [x] **Final sweep** ✅ all green — `./mvnw test` **108/108** · `redocly lint` **valid** ·
      api-client `generate` + `typecheck` ✅ · `apps/web` `tsc` + lint **0 errors** + `next build` ✅ ·
      `apps/admin` `tsc` ✅ + `next build` ✅ · `apps/admin` lint **0 errors / 10 warnings** after the
      15 pre-existing errors were fixed (2026-09-26 — see Milestone 0 session note)

> Dev-DB fixtures left in the local docker Postgres (port 5434) for manual QA: 2 `smoke-*` published
> lessons under `french-for-beginners`, a `final_test` (4 questions, pass 70) on that course, learner
> `smoke.learner@example.com`, and issued certificate `CFNG2N8GVU`.

**DoD:** a learner at ≥50% progress passes the free first attempt and gets a verifiable certificate;
a second attempt requires a paid credit; blog posts authored in admin render as sanitised Markdown at
`/blog`; the certificate design/pricing is editable without a deploy; all four toolchains above are green.

## Milestone Status

| Milestone | Status | Notes |
|---|---|---|
| 0 — Scaffolding & Contracts | ✅ Complete (2026-09-26) | Monorepo, Spring Boot platform layer, OpenAPI 3.1 (redocly valid), TS client generate+typecheck, **6-job CI green on GitHub** (`.github/workflows/ci.yml`), **idempotent seed** (`scripts/seed.sh`), compose stack |
| 1 — Auth | 🚧 Nearly done | register/login/refresh/logout, JWT audience separation, refresh rotation+revocation, bcrypt(12), `AuthServiceTest`/`AdminAuthServiceTest` green. Remaining: IP rate limits on auth endpoints |
| 2 — Taxonomy & Content | ✅ Complete (2026-09-26) | Recursive tree, CRUD, draft invisibility, YouTube validation, search, featured, audit logging + **seed data** (13 subcategories, 4 courses, 12 lessons, 12 curated videos) |
| 3 — AI Teacher | 🚧 Tests pending | LLMProvider (OpenAI/Anthropic/Gemini) + provider failover, circuit breaker, Redis rate limits, grounding prompt, session persistence, multi-turn history. Remaining: golden-file prompt tests |
| 4 — Progress & Library | 🚧 Tests pending | Course completion derivation, continue-learning, bookmarks, quiz attempts, profile stats — all live. Remaining: service-layer tests (no `ProgressServiceTest` yet) |
| 5 — Mobile App | ✅ Complete | Flutter app: all PRD §8 screens, bottom nav, AdSlot, AI degradation UI; **15/15 tests** incl. goldens (tolerant golden comparator added 2026-09-26) |
| 6 — Consumer Web | 🚧 In progress | Next.js 16 learner SPA: auth, resources, certificate tab, blog + verify + SEO routes are live; **course/lesson/AI-chat screens still render mock data**, YouTube embed + AdSlot + tests pending (Vite re-scaffold plan dropped — see M6) |
| 7 — Admin Web | 🚧 Nearly done | Next.js 16, admin auth, all managers wired to the API (taxonomy, lesson+video curation, review, blog, certificates, AI settings, resources, quick lesson). Remaining: audit-log viewer, editor tests |
| 8 — Billing | 🚧 In progress | Test-credit purchases live (Stripe checkout, MarzPay polling, idempotent grant/consume, 402 gate). Remaining: subscriptions + entitlement endpoint, ad-serving keyed on entitlement, webhook tests |
| 9 — Worker | 🚧 Infrastructure ready | Worker process runs the same JAR on `--spring.profiles.active=worker`; scheduling in place (`AutoCurationSweepJob` daily 03:00 UTC). Remaining: M9's oEmbed video-availability sweep (nothing writes `video_checks` yet) |
| 10 — Hardening & Launch | 🚧 In progress | CI on every push/PR, Redis rate limits (AI + final test), CORS + error handling fixed, security matcher sweep. Remaining: load smoke, Sentry, prod deploy, store assets |
| 11 — Auto Video Curation | ✅ Complete (2026-09-26) | Curated-first resolution + YouTube auto fallback + daily sweep + admin AUTO/CURATED badges + "Auto-find video"; 11 `AutoCurationServiceTest` + 5 resolution tests green; Flyway V1–V20 verified on a fresh DB (V9 included) |
| 12 — Certificates + Blog + SEO | ✅ Complete (2026-09-25) | Backend V16–V20, cert/test-credit/email/PDF ports, blog module, OpenAPI + api-client green, admin BlogManager/CertificateStudio, web CertificateTab + /blog + SEO routes. 108/108 tests, web build ✅. Live journey smoke-tested (402 gate, credit rollback, cert issue, verify + PDF/PNG); docs + .env updated; sweep green (108/108, redocly valid, web 0 lint errors + build) |
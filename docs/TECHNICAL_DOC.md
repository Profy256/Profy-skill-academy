# Profy Skill Academy — Technical Design Document

**Version:** 1.0
**Source of truth:** `profy_skill_academy_prd.md` (v1.4)
**Companion build plan:** `todo.md` (milestones are executed in order)
**Date:** 2026-09-11

> This document is the agreed technical interpretation of the PRD. If the PRD and this
> document conflict, the PRD wins on *what*, this doc wins on *how* — and the conflict
> gets logged in §13 (Decision Log).

---

## 1. Resolved Decisions (from PRD open questions)

| # | PRD open question | Decision | Rationale |
|---|---|---|---|
| D1 | Mobile stack (§9) | **Flutter** | User choice. Single codebase for iOS/Android. No code sharing with React web apps — shared contracts live in the OpenAPI spec instead. |
| D2 | Service boundaries (§4.1) | **Modular monolith (Java / Spring Boot 3)** with strict internal module boundaries + separate worker binary | Failure-isolation principle is enforced by module boundaries, per-module error recovery, and circuit breakers. Spring Boot provides mature ecosystem for security, data access, and observability. Modules can be extracted to services later without rewrites. |
| D3 | Web app timing (Q5) | **Ships together with mobile** in Phase 1 | User decision. Consumer auth and data are shared from day one. |
| D4 | AI provider | **Provider-agnostic adapter** using the **OpenAI-compatible chat-completions interface** | One adapter covers OpenAI, OpenRouter, Google Gemini (OpenAI-compat endpoint), and any other compatible API. Provider is a config value, not code. |
| D5 | Premium gating (Q1) | **Ad-free only.** All lesson content is open to Free users at MVP | Simplest shippable model; no paywall logic in content APIs. |
| D6 | Ad network (Q2) | **Placeholder ad slots** with server-driven placement/frequency config; no real network wired at MVP | User undecided ("don't know yet"). Building the slot system now means swapping in AdMob (or any network) later is a client-package change, not a redesign. |
| D7 | Curator roles (Q4) | **Solo admin** for MVP. Single admin role; full CRUD | Fastest to ship. Roles table is designed so Admin/Curator split can be added without migration pain (see §6.9). |
| D8 | Payments | **Stripe Checkout on web**; **native IAP (Play Billing / Apple StoreKit) on mobile**, managed via RevenueCat; mobile money (MTN/Airtel) deferred to Phase 2 | App-store rules *require* native IAP for digital subscriptions on iOS/Android. Stripe handles web cards. Uganda mobile money needs a separate PSP (e.g. Flutterwave/PawaPay) — designed for, not built, in Phase 1. |

---

## 2. System Overview

Three independent frontends, one Java backend, shared PostgreSQL + Redis.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Mobile app  │   │  Web app     │   │  Admin app   │
│  (Flutter)   │   │  (React+TS)  │   │  (React+TS)  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │  consumer JWT    │  consumer JWT    │  admin JWT (separate audience)
       └────────┬─────────┴─────────┬────────┘
                ▼                   ▼
        ┌─────────────────────────────────┐
        │       Java API (Spring Boot modular monolith)│
        │  auth │ taxonomy │ lessons │ ai │
        │  progress │ billing │ adminops  │
        └───────┬─────────────────┬───────┘
                ▼                 ▼
        ┌──────────────┐  ┌──────────────────┐
        │ PostgreSQL   │  │ Worker (Go)      │
        │ (shared)     │  │ video-availability│
        └──────────────┘  │ checks, jobs     │
                ▲         └──────────────────┘
        ┌──────────────┐
        │ Redis        │  cache, rate limits, refresh-token store
        └──────────────┘
                ▲
        ┌──────────────┐
        │ External:    │  LLM (OpenAI-compatible) · Stripe ·
        │              │  RevenueCat · YouTube embed (client-side)
        └──────────────┘
```

**YouTube video playback is client-side only** (YouTube IFrame API / `youtube_player_iframe` on Flutter, IFrame embed on web). The backend never proxies or transcodes video; it stores metadata only.

### 2.1 Failure-Isolation Rules (PRD §4.1 — non-negotiable)

1. Every HTTP handler runs behind a per-request `recover` middleware; a panic in one module returns 500 for that request only.
2. **AI Teacher degradation contract:** if the AI module errors, times out, or its circuit breaker is open, the API returns `503 { "error": "ai_unavailable" }`. Clients treat this as "chat unavailable" and the lesson (video + written content) remains fully usable. AI failure can never break the lesson screen.
3. Admin CRUD endpoints and consumer read endpoints share no code path beyond middleware; a bad admin deploy can't corrupt consumer reads (validated at review; separate route groups, separate auth).
4. The worker is a separate binary (`cmd/worker`): if video-availability checks crash or hang, the API is unaffected.
5. Modules communicate through their exported service interfaces, never by reaching into another module's repository or tables.
6. Mobile and web clients are independently deployable and versioned; all shared contract lives in the OpenAPI spec (`backend/api/openapi.yaml`).

---

## 3. Monorepo Layout

```
profy-skill-academy/
├── profy_skill_academy_prd.md
├── todo.md                      # build plan, executed in order
├── docs/
│   ├── TECHNICAL_DOC.md         # this file
│   └── adr/                     # decision records (one file per D1–D8 as needed)
├── backend/
│   ├── pom.xml                                      # Maven project (Spring Boot 3)
│   ├── mvnw                                         # Maven wrapper
│   ├── Dockerfile                                   # Multi-stage build
│   ├── api/openapi.yaml                             # single source of truth for all clients
│   ├── src/main/java/com/profy256/profy/
│   │   ├── ProfyApplication.java                    # Spring Boot entry point
│   │   ├── platform/                                # config, security, error handling, audit
│   │   └── modules/
│   │       ├── auth/                                # consumer auth (mobile + web)
│   │       ├── taxonomy/                            # recursive categories/courses
│   │       ├── lessons/                             # lesson content + curated videos
│   │       ├── ai/                                  # AI Teacher (provider-agnostic)
│   │       ├── progress/                            # completion, bookmarks, quiz attempts
│   │       ├── billing/                             # Stripe webhooks, RevenueCat, entitlements
│   │       ├── adminauth/                           # separate admin auth layer
│   │       └── adminops/                            # curator CRUD + review dashboard endpoints
│   └── src/main/resources/
│       ├── application.yml                          # Spring Boot config
│       └── db/migration/                            # Flyway SQL migrations
├── apps/
│   ├── mobile/                  # Flutter (consumer)
│   ├── web/                     # React + TypeScript + Vite (consumer)
│   └── admin/                   # React + TypeScript + Vite (curator/admin)
├── packages/
│   └── api-client/              # generated TS client from openapi.yaml (web + admin)
├── docker-compose.yml           # postgres, redis, api, worker (local dev)
└── .github/workflows/ci.yml
```

**Stack summary**

| Layer | Tech |
|---|---|
| Backend | Java 21+, Spring Boot 3.2+, Spring Web, Spring Data JPA (Hibernate), Spring Data Redis (Lettuce), Spring Security, Flyway, SLF4J + Logback |
| DB / cache | PostgreSQL 16, Redis 7 |
| Mobile | Flutter 3.x, Dart, Riverpod, go_router, `youtube_player_iframe`, dio |
| Web + Admin | React 18, TypeScript, Vite, TanStack Query, Tailwind CSS |
| API contract | OpenAPI 3.1, generated TS client; Flutter client hand-written against the same spec |
| Infra | Docker Compose (dev), single VPS or Fly.io/Railway (prod Phase 1) |
| CI | GitHub Actions: lint + tests on every PR |

---

## 4. Data Model (PostgreSQL)

All tables use `uuid` PKs (`gen_random_uuid()`), `created_at`/`updated_at timestamptz`.
Schema lives in `backend/migrations/`.

### 4.1 Taxonomy (recursive — PRD §6)

```sql
taxonomy_nodes (
  id            uuid PK,
  parent_id     uuid NULL REFERENCES taxonomy_nodes(id),  -- self-reference
  node_type     text CHECK (node_type IN ('category','subcategory','course')),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,                      -- globally unique
  description   text,
  icon          text,                                      -- optional icon key
  phase         smallint NOT NULL DEFAULT 1,               -- 1 = launch, 2 = hidden
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  depth         smallint NOT NULL                          -- 0..2, maintained on write
)
-- Note: "levels may be skipped" (PRD §6) is handled naturally: a course may hang
-- directly off a category (parent = category, no intermediate subcategory).
```

Seed data (Phase 1, from PRD): categories **Technology**, **Business & Finance**, **Languages**; Phase-2 categories seeded with `phase = 2` and **never returned** by consumer APIs (server-side filter).

### 4.2 Lessons & curated videos

```sql
lessons (
  id            uuid PK,
  node_id       uuid NOT NULL REFERENCES taxonomy_nodes(id),  -- usually a course node
  title         text NOT NULL,
  slug          text NOT NULL,
  description   text,
  explanation   text,                       -- written explanation (AI scope)
  objectives    jsonb DEFAULT '[]',         -- AI scope
  examples      jsonb DEFAULT '[]',         -- AI scope
  exercises     jsonb DEFAULT '[]',         -- AI scope
  quizzes       jsonb DEFAULT '[]',         -- AI scope: [{question, options[], answer_index}]
  level         text NULL CHECK (level IN ('beginner','intermediate','advanced')),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  sort_order    integer NOT NULL DEFAULT 0,
  created_by    uuid NOT NULL REFERENCES admin_users(id),
  UNIQUE (node_id, slug)
)

lesson_videos (
  id               uuid PK,
  lesson_id        uuid NOT NULL REFERENCES lessons(id),
  youtube_video_id text NOT NULL,            -- the ID, not the URL
  title            text NOT NULL,
  channel          text,
  is_primary       boolean NOT NULL DEFAULT false,   -- exactly one primary per lesson
  curator_status   text NOT NULL DEFAULT 'approved'
                   CHECK (curator_status IN ('pending','approved','flagged','unavailable')),
  date_reviewed    date,
  notes            text,                      -- curator evaluation notes
  source           text NOT NULL DEFAULT 'curated'   -- 'curated' (admin) | 'auto' (YouTube-search fallback; V9)
                   CHECK (source IN ('curated','auto')),
  added_by         uuid REFERENCES admin_users(id)   -- nullable: auto videos have no admin author (V9)
)
-- V9: partial unique index uq_lesson_videos_one_auto ON lesson_videos(lesson_id) WHERE source='auto'
--     → at most one auto-sourced video per lesson.

video_checks (
  id              uuid PK,
  lesson_video_id uuid NOT NULL REFERENCES lesson_videos(id),
  checked_at      timestamptz NOT NULL,
  is_available    boolean NOT NULL
)
```

### 4.3 Consumer users & auth

```sql
users (
  id            uuid PK,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,               -- bcrypt
  name          text NOT NULL,
  avatar_url    text,
  is_active     boolean NOT NULL DEFAULT true
)

refresh_tokens (                             -- stored in DB + Redis for fast revoke
  id          uuid PK,
  user_id     uuid NOT NULL REFERENCES users(id),
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz NULL,
  device      text                            -- 'mobile' | 'web'
)

user_interests (                             -- onboarding category picker
  user_id     uuid REFERENCES users(id),
  node_id     uuid REFERENCES taxonomy_nodes(id),
  PRIMARY KEY (user_id, node_id)
)
```

### 4.4 Progress, bookmarks, quiz attempts (PRD Q3 — certificate-ready)

```sql
lesson_progress (
  user_id         uuid REFERENCES users(id),
  lesson_id       uuid REFERENCES lessons(id),
  status          text NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress','completed')),
  completed_at    timestamptz,               -- captured NOW for certificates
  updated_at      timestamptz,
  PRIMARY KEY (user_id, lesson_id)
)
-- Course completion is DERIVED: a course node is complete when all its published
-- lessons are completed for that user (computed in progress module, cached in Redis).

quiz_attempts (                              -- PRD Q3: scores + attempts captured now
  id             uuid PK,
  user_id        uuid REFERENCES users(id),
  lesson_id      uuid REFERENCES lessons(id),
  score          integer NOT NULL,
  total          integer NOT NULL,
  passed         boolean NOT NULL,
  attempt_number integer NOT NULL,
  created_at     timestamptz NOT NULL
)

bookmarks (user_id uuid, lesson_id uuid, created_at timestamptz, PRIMARY KEY (user_id, lesson_id))

-- Phase 2 anticipation (PRD §7.5): table created NOW, unused, so no migration later.
certificates (
  id            uuid PK,
  user_id       uuid NOT NULL,
  course_node_id uuid NOT NULL,
  cert_code     text UNIQUE,                 -- e.g. 'ABC123' for /verify/ABC123
  issued_at     timestamptz,
  revoked_at    timestamptz
)
```

### 4.5 Subscriptions & entitlement

```sql
subscriptions (
  id                       uuid PK,
  user_id                  uuid NOT NULL REFERENCES users(id),
  platform                 text NOT NULL CHECK (platform IN ('web','ios','android')),
  provider                 text NOT NULL CHECK (provider IN ('stripe','revenuecat')),
  provider_customer_id     text,
  provider_subscription_id text NOT NULL,
  plan                     text NOT NULL CHECK (plan IN ('monthly','yearly')),
  status                   text NOT NULL CHECK (status IN ('active','canceled','past_due','expired')),
  current_period_end       timestamptz,
  created_at, updated_at
)
-- Entitlement rule (D5): user.is_premium = EXISTS(active|canceled-but-unexpired subscription).
-- Implemented as a single query + Redis cache (60s TTL). No content gating on Free (D5).
```

### 4.6 AI chat persistence

```sql
ai_chat_sessions (id uuid PK, user_id uuid, lesson_id uuid, created_at, UNIQUE (user_id, lesson_id))
ai_chat_messages (id uuid PK, session_id uuid, role text CHECK (role IN ('user','assistant')),
                  content text, created_at)
```

### 4.7 Admin users & audit

```sql
admin_users (
  id uuid PK, email text UNIQUE, password_hash text, name text,
  role text NOT NULL DEFAULT 'admin'   -- D7: only 'admin' at MVP; 'curator' reserved
)

audit_log (id uuid PK, admin_user_id uuid, action text, entity text, entity_id uuid,
           payload jsonb, created_at)   -- every admin write is logged
```

---

## 5. API Design

REST under `/api/v1`, JSON, OpenAPI 3.1 spec in `backend/api/openapi.yaml` (the contract all three clients build against).

**Auth model**
- Consumer (mobile + web share it): `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`. Short-lived JWT access token (15 min, audience `consumer`) + rotating refresh token (30 days, DB+Redis).
- Admin: separate `/api/v1/admin/auth/*` endpoints issuing JWTs with audience `admin`. An admin token cannot call consumer endpoints and vice versa. Admin auth is a distinct user table (`admin_users`).

**Principal endpoint groups**

```
Public (consumer):
GET  /taxonomy/tree?phase=1               # Phase-2 nodes filtered server-side, always
GET  /taxonomy/nodes/:slug                # node + children + breadcrumb
GET  /search?q=                           # name/description match on courses+lessons
GET  /home/featured                       # featured skills carousel

GET  /courses/:slug                       # course detail + lesson list (by level)
GET  /lessons/:slug                       # full lesson: fields + primary video + alternates

AI Teacher:
POST /lessons/:id/ai/chat                 # { message } → { reply } (session auto-created)
GET  /lessons/:id/ai/messages             # chat history for the lesson

Progress & library (auth):
PUT  /lessons/:id/progress                # { status: in_progress|completed }
GET  /progress/continue                   # continue-learning shortcut
GET  /library/bookmarks   POST/DELETE /library/bookmarks/:lessonId
POST /lessons/:id/quiz-attempts           # { score, total } → server records attempt
GET  /profile/stats                       # courses completed, lessons completed, streak-ish data

Billing (auth):
GET  /entitlement                         # { is_premium, plan, current_period_end }
POST /billing/checkout                    # web only → Stripe Checkout session URL
POST /billing/revenuecat-webhook          # mobile IAP events (server-to-server)

Admin (admin JWT, separate group):
CRUD /admin/taxonomy                      # recursive create/edit/reorder
CRUD /admin/lessons                       # all content fields incl. quizzes
CRUD /admin/lessons/:id/videos            # candidates, set primary/alternates, status
GET  /admin/review/videos                 # flagged/unavailable queue (dashboard)
GET  /admin/audit-log
```

**Conventions**
- Errors: `{ "error": { "code": string, "message": string } }` with stable machine codes (`ai_unavailable`, `rate_limited`, …).
- Cursor pagination on list endpoints. ETags on lesson content (heavy-ish payloads).
- Version the mobile app: clients send `X-App-Version`; API can force-update flags later.
- All admin writes are idempotent where possible and audit-logged.

---

## 6. Module Design (Java backend)

Each module in `com.profy256.profy.modules.<name>/` contains a `@RestController` (HTTP), `@Service` (business rules), and JPA repository (data access). Cross-module calls go through injected service interfaces only. Routes are defined via `@RequestMapping` annotations — adding/removing a module is a class-level change.

### 6.1 `auth` (consumer)
Register/login/refresh/logout. bcrypt costs 12. Refresh rotation with reuse detection (revoke family on replay). Shared by mobile and web identically — `device` field distinguishes token families.

### 6.2 `taxonomy`
Recursive tree read/write. Consumer reads force `phase = 1 AND is_active` (server-side — Phase 2 data is never serialized to consumers). Cycle prevention on write (depth check ≤ 2 for MVP). Slug uniqueness enforced in DB.

### 6.3 `lessons`
CRUD + public reads. Public lesson payload = all AI-scope fields + primary video (`youtube_video_id`, title, channel) + alternates. Draft lessons invisible to consumers.

### 6.4 `ai` — AI Teacher (PRD §7.3)

- **Grounding contract:** the system prompt is built *only* from the lesson's own fields: title, description, explanation, objectives, examples, exercises, quizzes. No transcript access, no general web answers. Prompt instructs the model to answer only from provided context and reply with a fixed refusal snippet when asked off-topic.
- **Provider adapter (D4):** one interface, many configs:

```java
public interface LLMProvider {
    ChatResponse complete(ChatRequest request);
}
// OpenAiCompatibleProvider implements it for any OpenAI-compatible API.
// Config: AI_BASE_URL, AI_API_KEY, AI_MODEL  → works with OpenAI, OpenRouter,
// Gemini's OpenAI-compat endpoint, Groq, local vLLM, etc. Swapping = env change.
```

- **Resilience:** 15s timeout per call, circuit breaker (5 consecutive failures → open 60s), single retry with backoff. While open, endpoint returns `503 ai_unavailable` immediately (see §2.1 rule 2).
- **Cost control:** Redis rate limit per user/day — Free: 20 msgs, Premium: 200 (env-configurable). Lesson context is truncated to a token budget; chat history capped to last 10 turns per request.
- **Persistence:** one session per (user, lesson); messages stored for history and future quality analysis.

### 6.5 `progress`
Lesson completion writes, derived course completion (computed + Redis-cached, invalidated on write), continue-learning, bookmarks, quiz attempts. Quiz scoring happens client-side against `quizzes` JSON; server records the attempt (scores are not security-critical at MVP).

### 6.6 `billing`
Stripe Checkout (web) + webhook (`subscription_created/updated/deleted`, `invoice.paid`) → upsert `subscriptions`. Mobile: RevenueCat SDK on clients → RevenueCat server webhook → same table. Entitlement = cached query (§4.5). Mobile-money PSP hooks (Flutterwave/PawaPay) are a Phase-2 extension of this module.

### 6.7 `adminauth` + 6.8 `adminops`
Separate login, separate JWT audience, audit logging middleware. `adminops` exposes all curator CRUD + the review-dashboard feed (`curator_status IN ('flagged','unavailable')` joined with last `video_checks`).

### 6.9 Roles note (D7)
`admin_users.role` exists from day one with only `'admin'`. Middleware reads role; when curators are added, insert `role='curator'` rows and tighten the middleware check — **no migration required**.

### 6.10 Worker (`cmd/worker`)
- **Video availability checker:** daily job iterates `lesson_videos` where `curator_status='approved'` and checks availability via YouTube oEmbed (`https://www.youtube.com/oembed?url=...`) — no API key needed at MVP. Unavailable → `curator_status='unavailable'`, surfaces in admin review dashboard, and (Phase-1 nice-to-have) consumer API serves the primary alternate instead.
- **Auto-curation sweep (M11, 2026-09-15):** daily job auto-fills published lessons that have no video rows at all via YouTube Data API v3 search (`YOUTUBE_API_KEY`; unset = disabled). Complements the runtime fallback in `getLessonBySlug` (auto-fill on first learner read). Curated-first resolution: approved curated primary → newest approved curated → auto → none. Search costs 100 quota units/call — runs are capped and only fire for uncovered lessons.
- Runs on its own schedule (cron-style loop); safe to crash/restart independently of the API.

---

## 7. Frontend Design

### 7.1 Mobile (Flutter) — consumer

- **State:** Riverpod · **Routing:** go_router · **HTTP:** dio + generated models from OpenAPI (hand-checked) · **Video:** `youtube_player_iframe` (IFrame API under the hood, per PRD §9).
- **Screens (PRD §8):** Welcome → Choose Learning Interest (optional) → Home (search, featured carousel, Phase-1 category grid) → Search Results → Course Detail (lesson list grouped by level) → Lesson (video + tabbed written content + **Ask AI Teacher**) → AI Chat → Library (bookmarks, completion status, continue learning) → Profile (stats, settings, subscription) → Subscription (Free vs Premium).
- **Bottom nav:** Home · Learn · Library · Profile.
- **Ads (D6):** in-house `AdSlot` widget with placement IDs (`home_banner`, `lesson_banner`, `lesson_interstitial`, `library_banner`). Frequency + enablement come from `GET /config` (server-driven). MVP renders a tasteful placeholder; AdMob Flutter SDK drops in behind the same widget later.
- **Resilience:** AI chat failures show a "AI Teacher is unavailable right now" state; lesson screen never depends on AI. Network errors degrade per-section, not per-screen.

### 7.2 Web (React + TS) — consumer
Mirrors mobile 1:1 (PRD assumption held; D3). Responsive layout, same routes/flows, same generated API client as admin. YouTube IFrame embed. AdSlot web component analog.

### 7.3 Admin (React + TS)
Screens: Login → Taxonomy Manager (tree UI, drag-order, phase toggle) → Lesson Editor (rich fields incl. quiz JSON editor) → Video Curation (per lesson: candidate list, paste YouTube URL → preview embed, set primary/alternates, curator status, review date) → Review Dashboard (flagged/unavailable queue). Solo-admin auth (D7), audit-logged actions.

---

## 8. Environments & Configuration

`.env.example` committed; secrets never committed.

```
# Backend
DATABASE_URL=postgres://...        REDIS_URL=redis://...
JWT_SECRET=...                     PORT=8080
# AI (OpenAI-compatible — swap provider via env, D4)
AI_BASE_URL=https://openrouter.ai/api/v1   AI_API_KEY=...   AI_MODEL=...
# Billing
STRIPE_SECRET_KEY=...              STRIPE_WEBHOOK_SECRET=...
REVENUECAT_WEBHOOK_AUTH=...
# Ads (D6 — reserved for when a network is chosen)
ADMOB_APP_ID=
```

Local dev: `docker-compose up` → Postgres, Redis, API (with migrate-on-start), worker. Mobile: `flutter run` against `http://localhost:8080` (10.0.2.2 for Android emulator). Web/admin: Vite dev servers proxying `/api`.

---

## 9. Testing & Quality

- **Backend:** JUnit 5 unit tests per module service; integration tests with Testcontainers against dockerized Postgres; Spring MockMvc for controllers; AI module tested with a fake `LLMProvider`. Target: all modules ≥ 70% on service layer; AI grounding prompts have golden-file tests.
- **Flutter:** unit tests for repositories/blocs; widget tests for Home, Lesson, AI Chat (mocked dio); one golden test per core screen.
- **Web/Admin:** Vitest + React Testing Library on critical flows (taxonomy editor, lesson editor, chat).
- **CI (GitHub Actions):** lint + test all three workspaces on every PR; `main` must stay green.
- **Manual QA gate per milestone:** defined in `todo.md` acceptance criteria.

---

## 10. Security

- bcrypt(12) passwords via Spring Security `PasswordEncoder`; JWTs signed HS256 (single secret, two audiences: `consumer`, `admin`).
- Refresh-token rotation + reuse detection; logout revokes via Redis blacklist.
- Admin and consumer tokens are never interchangeable (Spring Security authority check via `JwtAuthFilter`).
- Parameterized SQL only (Spring Data JPA / Hibernate). All admin input validated; audit log on every write.
- YouTube IDs sanitized server-side (regex `^[A-Za-z0-9_-]{11}$`).
- Rate limits: auth endpoints (IP-based), AI chat (per-user, §6.4).
- CORS restricted to web + admin origins in prod (Spring `CorsFilter`).

---

## 11. Deployment (Phase 1)

Single VPS (or Fly.io/Railway) running: `api` container, `worker` container, managed Postgres, managed Redis. Caddy/Nginx TLS reverse proxy. deploys are per-binary — API and worker can deploy independently (failure-isolation). Mobile ships via Play Store / App Store (TestFlight → closed testing first). Web/admin are static builds behind the same proxy.

Backups: Postgres daily snapshots. Observability: structured JSON logs (SLF4J + Logback) + `/healthz` uptime check; Sentry SDKs on all three clients (Phase-1 nice-to-have).

---

## 12. Phase 2 Readiness (built now, shipped later)

| Phase 2 item | Already in place |
|---|---|
| Certificates + /verify page | `certificates` table, completion timestamps, quiz attempts/scores captured |
| Vocational categories | `taxonomy_nodes.phase = 2` filter; seed rows hidden, not absent |
| Mobile money payments | `billing` module isolated; PSP = new provider behind same subscriptions table |
| Ad network | `AdSlot` abstraction + server-driven frequency config |
| Curator roles | `admin_users.role` + role-aware middleware |

---

## 13. Decision Log (append-only)

| Date | Decision |
|---|---|
| 2026-09-10 | D1–D8 adopted (see §1). Modular monolith over services per §2.1 isolation mechanisms. |
| 2026-09-11 | Backend migrated from Go to Java/Spring Boot 3. Same modular monolith architecture, same API contracts (OpenAPI unchanged), same failure-isolation rules. |

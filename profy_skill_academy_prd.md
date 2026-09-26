# Dera Skul — Product Requirements Document

**Version:** 2.0 (Draft)
**Status:** Phase 1 build in progress — product requirements current as of 2026-09-26
**Owner:** Profy256

---

## 1. Overview

Dera Skul is a mobile learning platform for practical, applied skills — starting with technology, business/finance, and languages, with vocational trade skills (food production, agriculture, construction, automotive, beauty & fashion, manufacturing, etc.) planned as a future expansion.

The platform combines curated video lessons (sourced from YouTube, human-curated via a separate admin web app) with an AI Teacher available inside every lesson to answer questions when a learner gets confused.

Two additional Phase 1 surfaces exist to drive acquisition and trust: a **verifiable certificate** issued when a learner passes a course's final test (public `/verify/{code}` page with PDF + QR), and an **admin-authored Markdown blog** published at `/blog` and wired into sitemap, RSS, and `llms.txt` for SEO/GEO.

**Tagline:** "Learn Anything. Anytime. Anywhere."

---

## 2. Problem Statement

*(Draft — confirm/edit as needed.)*

Self-directed learners in Uganda and East Africa have little affordable, credible access to practical tech, business, and language skills: bootcamps and short courses are expensive or out of reach, free content on YouTube is unstructured with no way to prove what you finished, and a learner who gets stuck at 11pm has nobody to ask. Dera Skul bundles human-curated lessons with an always-available AI Teacher inside every lesson and a publicly verifiable certificate at the end — delivered on the phone the learner already owns.

---

## 3. Target Users

*(Draft assumption — edit as needed.)*

- Primary: Self-directed learners in Uganda/East Africa seeking employable tech, business, or language skills without access to formal training
- Secondary: solo curator/admin (Profy at MVP) producing and vetting content in the admin panel

---

## 4. System Architecture (Three Products)

This is now **three separate frontends sharing one backend**:

1. **Consumer mobile app** — the learner-facing product on iOS/Android (screens in Section 8)
2. **Consumer web app** — the same learner-facing product, browser-based (assumption: mirrors the mobile app's feature set — browse, watch lessons, AI Teacher, Library, Profile, subscription — unless stated otherwise; flag if the web app should differ in scope from mobile)
3. **Admin panel** — a separate web app for curators/admins to create categories, subcategories, courses, and lessons, and attach curated YouTube videos

All three consume the same backend/API and database, but ship as independent codebases with independent auth per product (consumer auth shared/synced between mobile and web; admin auth is a distinct role layer).

### 4.1 Coupling & Resilience Principle

**A failure or bug in one subsystem must not take down the others.** Specifically:
- Admin app being down, broken, or mid-deploy must not affect mobile or web consumer apps — curators editing content should never risk breaking what learners are actively using
- AI Teacher failing (outage, bug, API error) must degrade gracefully — the lesson video and written content must still work with the chat feature simply unavailable, not the whole lesson screen breaking
- Mobile and web apps should be independently deployable — a mobile release shouldn't require a web release and vice versa
- Backend should be structured so these concerns are separable (e.g. distinct services/modules for taxonomy & lessons, AI Teacher, video/curation, and admin operations) rather than one monolith where any bug can cascade everywhere
- **Service boundaries — resolved (see `docs/TECHNICAL_DOC.md` §1, D2):** a **modular monolith in Java / Spring Boot 3**, one module per domain area, with a separate worker process (same JAR, `worker` profile) for scheduled jobs. The failure-isolation requirement above is non-negotiable and is enforced by module boundaries, per-module error recovery, and circuit breakers; modules can be extracted into services later without rewrites.

---

## 5. Goals & Non-Goals

### Goals (Phase 1 / MVP)
- Consumer mobile app: browse → watch → ask AI Teacher when confused → track completion
- Consumer web app: same core learning flow as mobile, browser-based, plus the blog and certificate verification pages (SEO/GEO surfaces are web-only by nature)
- Admin web app: curators can create taxonomy entries, courses, lessons, and attach vetted YouTube links; author blog posts; edit final tests and certificate design/pricing
- Launch with 3 top-level categories: Technology, Business & Finance, Languages (Phase 2 categories hidden entirely)
- Freemium model live across mobile and web: Free tier shows ads, Premium is ad-free
- **Certificates live:** course final test with a free first attempt (once learner progress passes a threshold) and a paid retake credit, server-side grading, and a publicly verifiable certificate
- **Blog + SEO/GEO live:** admin-authored Markdown posts served at `/blog`, plus sitemap, RSS feed, `llms.txt`, and machine-readable verification pages

### Non-Goals (Phase 1)
- Vocational/trade categories — deferred to Phase 2, hidden from UI at launch
- Real ad-network integration — placeholder ad slots only (server-driven placement/frequency config), network wiring deferred (see `docs/TECHNICAL_DOC.md` §1, D6)
- Emotional Mentor — removed from scope entirely
- Mobile-money payments on store builds — native IAP (RevenueCat) on mobile, Stripe on web; MTN/Airtel mobile money deferred to Phase 2 (D8)

---

## 6. Taxonomy

**Structure:** `Category → Subcategory → Skill/Course → Lessons`, with levels allowed to skip when they don't apply to a given category. Not every category needs the same depth.

```
Technology
 └─ Programming
     └─ Go
         └─ Gin
             └─ REST APIs (lessons)
 └─ Networking
 └─ Linux
 └─ Cloud

Business & Finance
 └─ Entrepreneurship
 └─ Accounting
 └─ Personal Finance
 └─ Marketing
 └─ Business Management
 └─ Investment

Languages
 └─ English
     └─ Beginner / Intermediate / Advanced
 └─ French
 └─ German
 └─ Swahili
 └─ Spanish

Phase 2 (hidden at launch):
Food Production · Farming & Agriculture · Construction ·
Automotive · Beauty & Fashion · Manufacturing · etc.
```

**Data model implication:** recursive/self-referencing structure (e.g. `categories` table with nullable `parent_id`), not fixed-depth tables.

---

## 7. Core Features

### 7.1 Skill Discovery (Mobile App)
- Search bar + category browsing (per taxonomy above)
- Featured skills carousel on home screen
- Skill/course detail → list of lessons, with levels where applicable

### 7.2 Lesson Content & Video Curation

**Principle:** Admin-curated videos always take priority. Lessons a curator has not provided a video for are covered by an automatic YouTube-search fallback (`source='auto'`), clearly distinguishable and reviewed/replaced by curators later (product decision, 2026-09-15 — supersedes the original strict curated-only rule).

**Curation workflow (via Admin Web App):**
1. Curator creates a lesson within its Skill/Course (e.g. Python → Variables → Introduction to Variables)
2. Curator searches YouTube and shortlists 2–5 candidate videos
3. Evaluates each on: relevance, teaching quality, correctness, language, length, production quality, availability, fit to the lesson
4. Selects one primary video + optional alternates
5. Pastes the chosen YouTube link directly into the admin panel and attaches it to the lesson — this is the priority path, not automated fetching
6. Lesson record stores: YouTube video ID, title, channel, source (curated/auto), lesson ID, curator status, date reviewed
7. **Automatic fallback:** a lesson with no video is auto-filled (runtime on first learner read + daily sweep) from YouTube Data API search; the auto video serves immediately marked `source='auto'`, stays in the review queue, and is replaced the moment a curator attaches a curated video
8. System periodically checks video availability; flags for replacement if a video goes down

**Lesson content fields (also what the AI Teacher is scoped to — see 7.3):**
- Lesson title, description, written explanation, objectives, examples, exercises, quizzes

### 7.3 AI Teacher (Mobile App)
- Purpose: available inside every lesson so a learner who gets confused can ask a question and get an answer
- **Scope (fixed):** answers only from the lesson's own written fields — title, description, written explanation, objectives, examples, exercises, quizzes. Not transcript-aware of the YouTube video.
- Entry point: "Ask AI Teacher" button on the lesson screen, opens a chat scoped to that lesson

### 7.4 Progress Tracking & Library (Mobile App)
- Saved/bookmarked lessons, continue-learning shortcut
- Course-completion tracking feeds the certificate final test (≥50% progress unlocks the free first attempt — see §7.5)
- Profile stats: skills/courses learned

### 7.5 Certificates — Final Test & Verifiable Credential (Phase 1, built)

**Flow:** learner reaches the progress threshold → free first attempt at the course final test → a retake costs a `test_credit` → pass = score ≥ 70% (admin-editable) **and** the learner confirms the name to appear → certificate issued with a public verification URL.

| Element | Rule (all server-side enforced) |
|---|---|
| Unlock | Free 1st attempt iff `attempts == 0` **and** progress ≥ threshold (default 50%, admin-editable) |
| Retake | Every further attempt consumes one `test_credit` ($2.00 Stripe / 7,500 UGX MarzPay, admin-editable); insufficient credit → **402** |
| Pass | Score ≥ 70% (admin-editable) **and** `confirmName` provided; failed validation rolls the credit back |
| Issue | Certificate with human-readable code → `deraskul.com/verify/{code}` (public, no auth), PDF + PNG download, optional Resend email on a worker thread |
| Abuse control | Redis submit lock (60s) + hourly attempt cap → 429 |

- Final test content lives per course (`final_test jsonb`, admin-editable in the Certificates Studio); lesson quizzes remain ungraded practice
- Certificate **design and pricing are admin-editable** (colors, title/subtitle, logo, threshold/price) with a live preview — no deploy required
- Shareable credential = organic growth mechanism (see §11 Phase 1 scope)

### 7.6 Monetization — Freemium with Ads + Test Credits

| Tier | Access | Ads |
|---|---|---|
| Free | Full lesson access (no content paywall at MVP — see D5) | Ads shown |
| Premium | Full lesson access | Ad-free |

- Premium's core value proposition at MVP is **removing ads** — all lesson content is open to Free users at MVP (resolved: `docs/TECHNICAL_DOC.md` §1, D5)
- Monthly and yearly subscription options for Premium
- Ad implementation needs its own technical decision: ad network (e.g. AdMob), placement (between lessons? banner during video? interstitial?), and frequency — placeholder slots only at MVP (D6)
- **Test credits** are a separate micro-purchase, not a subscription: one retake credit = $2.00 (Stripe on web) / 7,500 UGX (MarzPay), admin-editable, consumed server-side (§7.5)

### 7.7 Admin Web App (Separate Product)
- Curator/admin auth, distinct from consumer app auth
- Create/edit: categories, subcategories, courses, lessons
- Attach and manage curated YouTube videos per lesson (curated-first resolution; auto-sourced fallback flagged `source='auto'`, §7.2)
- Review dashboard for flagged/unavailable videos (including auto-sourced rows)
- **Blog Manager:** write/edit Markdown posts with live preview, tags, reading time, draft → publish
- **Certificates Studio:** certificate design & pricing (live preview), final-test editor per course, credential settings, issued-certificate list
- Supporting tools: AI provider settings, quick-lesson/content import, resources manager
- Single admin role at MVP; roles table designed so an Admin/Curator split can be added later (D7 — see open questions)

### 7.8 Blog, SEO & GEO (Consumer Web)
- Admin-authored **Markdown blog** rendered server-side (sanitised) at `/blog` and `/blog/{slug}`
- Organic/GEO surfaces: `sitemap.xml`, `rss.xml`, `llms.txt`, `robots.txt`, JSON-LD + breadcrumbs + FAQ blocks
- Public **credential verification** pages (`/verify/{code}`) that machines can also read — supports the shareable-certificate growth loop
- Blog is web-only by design (SEO has no mobile equivalent); it must not affect the learning flow or the admin/learner auth separation

---

## 8. Screens

**Note:** The consumer web app mirrors the mobile app's learning flow 1:1 (same routes/flows, browser-responsive layout) and adds web-only acquisition surfaces — see the table below.

### Mobile App (and Consumer Web App, mirrored)
| Screen | Purpose |
|---|---|
| Welcome | First entry, brand intro, Get Started / Log In |
| Choose Learning Interest | Optional onboarding category picker |
| Home | Search, featured skills, category grid (Phase 1 categories only) |
| Skill/Course Search Results | List of matched courses/lessons |
| Skill Lesson | Video (curated) + written content tabs + Ask AI Teacher |
| AI Teacher Chat | Per-lesson Q&A |
| Library | Saved lessons, completion status |
| Profile | Stats, settings, subscriptions |
| Subscription Screen | Free (ads) vs Premium (ad-free) |
| Course → Certificate tab | Final-test state (locked / intro / test / result), retake purchase, issued credentials |

**Bottom nav:** Home · Learn · Library · Profile

### Web-only additions
| Screen | Purpose |
|---|---|
| Blog index `/blog` | Published posts, tags, reading time |
| Blog post `/blog/{slug}` | Server-rendered, sanitised Markdown + JSON-LD |
| Verify `/verify/{code}` | Public certificate verification + PDF/PNG download |
| RSS / sitemap / `llms.txt` | Machine-readable feeds (SEO/GEO) |

### Admin Web App
| Screen | Purpose |
|---|---|
| Login | Curator/admin auth |
| Taxonomy Manager | Create/edit categories, subcategories, courses |
| Lesson Editor | Create lesson content fields (title, description, explanation, objectives, examples, exercises, quizzes) |
| Video Curation | Search notes, candidate videos, select primary + alternates, attach to lesson |
| Review Dashboard | Flagged/unavailable videos needing replacement |
| Blog Manager | Author/edit Markdown posts (live preview, tags, draft → publish) |
| Certificates Studio | Certificate design & pricing, final-test editor, credentials list |
| AI Settings | Provider/API-key configuration (failover order) |

---

## 9. Technical Notes

- **Video:** YouTube IFrame API for embedded playback (mobile + web); store `youtube_video_id`, title, channel, curator status, source (`curated`/`auto`), last-reviewed date per lesson
- **Taxonomy:** recursive category model (`parent_id`)
- **Stack (as built):** Java 17 / Spring Boot 3 modular monolith (Maven, Flyway) + PostgreSQL 16 + Redis 7 + Docker; **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4** for both web and admin; **Flutter** for mobile; worker = same JAR on the `worker` profile
- **Consumer web app:** separate Next.js codebase, same backend API, shares consumer auth with mobile; adds `/blog`, `/verify/{code}`, RSS/sitemap/`llms.txt`
- **Admin web app:** separate Next.js codebase, same backend API, separate auth/role layer (curator vs. consumer user)
- **AI Teacher:** text-context Q&A grounded strictly in lesson fields — no video transcription; provider-agnostic OpenAI-compatible adapter with failover (D4)
- **Certificates & blog:** separate backend modules, event-driven decoupling (payments → credit, certificate → email/PDF) so a failure in one never blocks another
- **Quality gates:** GitHub Actions CI on `main` + PRs — backend unit tests, OpenAPI lint + generated TS client typecheck, lint/tsc/build for both Next apps, API boot + idempotent seed smoke test, Flutter analyze + tests
- **Ads:** network/placement/frequency not yet decided — placeholder slots only at MVP (D6)

---

## 10. Open Questions (Remaining)

**Resolved since v1.4** (see `docs/TECHNICAL_DOC.md` §1 decision log for rationale):

- ~~Does Premium only remove ads, or does it also unlock restricted content?~~ → **Ad-free only**; all lesson content open to Free at MVP (D5).
- ~~What must completion tracking capture for Phase 2 certificates?~~ → **Built in Phase 1** — final test, attempts, scores, credits, and certificates shipped in M12 (§7.5); nothing left to defer.
- ~~Must the consumer web ship simultaneously with mobile?~~ → **Yes, together in Phase 1** (D3).
- ~~Does the web mirror mobile, or differ?~~ → **Mirrors the learning flow 1:1**, plus web-only blog/verification/SEO surfaces (§8).
- ~~Service boundaries?~~ → **Modular monolith, Java/Spring Boot, one worker process** (D2).

**Still open:**

1. Which ad network, and what placement/frequency in the lesson flow? (slots exist server-side; wiring a network is not MVP — D6)
2. Who are the curators day-to-day — solely Profy, a small team, or does the admin app need role-based review/approval from the start? (solo admin at MVP — D7 — but the day-to-day answer is still open)
3. Uganda mobile-money PSP for web payments outside the app stores (MTN/Airtel) — Stripe covers cards; mobile money deferred to Phase 2 (D8)

---

## 11. Roadmap Summary

| Phase | Scope |
|---|---|
| Phase 1 (MVP) | Mobile app + consumer web app (Technology, Business & Finance, Languages + curated lessons with auto-fallback + AI Teacher + completion tracking + Free-with-ads/Premium-ad-free) + **certificates (free first attempt, paid retake, `/verify`)** + **Markdown blog + SEO/GEO** + Admin web app (taxonomy, lesson, video curation, blog manager, certificates studio, AI settings) + CI + seed data |
| Phase 2 | Food Production, Agriculture, Construction, Automotive, Beauty & Fashion, Manufacturing, etc. + real ad network wiring + mobile-money PSP + curator roles |
| Phase 3+ | TBD — expanded AI Teacher capability, automated video discovery (human approval retained), richer assessment engine |

---

## Changelog

- **v2.0 (2026-09-26)** — Scope synced with the build. Certificates moved **out of Phase 2 into Phase 1** as a shipped feature (§7.5: free first attempt at ≥50% progress, paid retake credit, ≥70% pass, public `/verify` + PDF/PNG, admin-editable design/pricing). New §7.8 Blog/SEO/GEO. §4 service-boundary question resolved (modular monolith, Java/Spring Boot 3 — D2). §9 stack corrected to what is built (Go → Java 17/Spring Boot 3; web/admin → Next.js 16 App Router, not Vite). Problem statement drafted. Open questions split into resolved (D1–D8) and still open. Roadmap Phase 1 now includes certificates, blog, CI, and seed data.
- **v1.5 (2026-09-15)** — Automatic video curation fallback approved (admin-curated videos always win; uncovered lessons get an auto-sourced video marked `source='auto'`). §5 non-goals and §7.2 workflow updated accordingly.
- **v1.4** — Architecture expanded from two products to three: consumer mobile app, consumer web app, and admin web app. Web app assumed to mirror mobile's feature set at MVP (flagged as open question — not yet confirmed). Two new open questions added on web app timing/scope.
- **v1.3** — Admin panel confirmed as a separate web app (not a mobile-app screen), added as its own product surface with its own screens/auth. Monetization resolved: Free tier shows ads, Premium is ad-free (content-gating still open).
- **v1.2** — Resolved taxonomy, AI Teacher data scope, video curation workflow, certificates (Phase 2, DB designed now), completion tracking moved into MVP.
- **v1.1** — Removed Emotional Mentor feature. Resolved AI Teacher scope: text-context Q&A.
- **v1.0** — Initial draft based on wireframe restructure.

# Profy Skill Academy — Product Requirements Document

**Version:** 1.4 (Draft)
**Status:** Planning
**Owner:** Profy256

---

## 1. Overview

Profy Skill Academy is a mobile learning platform for practical, applied skills — starting with technology, business/finance, and languages, with vocational trade skills (food production, agriculture, construction, automotive, beauty & fashion, manufacturing, etc.) planned as a future expansion.

The platform combines curated video lessons (sourced from YouTube, human-curated via a separate admin web app) with an AI Teacher available inside every lesson to answer questions when a learner gets confused.

**Tagline:** "Learn Anything. Anytime. Anywhere."

---

## 2. Problem Statement

*(To fill in — recommend 2-3 sentences on who struggles to access this kind of learning today and why. This anchors every later prioritization decision.)*

---

## 3. Target Users

*(To confirm — draft assumption below, edit as needed)*

- Primary: Self-directed learners in Uganda/East Africa seeking employable tech, business, or language skills without access to formal training

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
- **Open question added:** exact service boundaries (monolith-with-clear-modules vs. actual separate services) still needs a decision — but whichever is chosen, the failure-isolation requirement above is non-negotiable, not just a nice-to-have

---

## 5. Goals & Non-Goals

### Goals (Phase 1 / MVP)
- Consumer mobile app: browse → watch → ask AI Teacher when confused → track completion
- Consumer web app: same core learning flow as mobile, browser-based
- Admin web app: curators can create taxonomy entries, courses, lessons, and attach vetted YouTube links
- Launch with 3 top-level categories: Technology, Business & Finance, Languages (Phase 2 categories hidden entirely)
- Freemium model live across mobile and web: Free tier shows ads, Premium is ad-free

### Non-Goals (Phase 1)
- Vocational/trade categories — deferred to Phase 2, hidden from UI at launch
- Dynamic/algorithmic YouTube search-and-display as a *replacement* for curation — admin-curated videos always take priority. An automatic YouTube-search fallback covers lessons a curator has not provided a video for yet (product decision, 2026-09-15); see §7.2
- Full certificate generation/verification system — deferred to Phase 2, DB schema should anticipate it
- Emotional Mentor — removed from scope entirely

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
- Course-completion tracking is MVP scope, even though certificates are Phase 2 — Phase 2 depends on this data already existing
- Profile stats: skills/courses learned

### 7.5 Certificates (Phase 2 — design now, build later)
- DB should anticipate it so Phase 2 doesn't require a migration
- Anticipated flow: course completed → assessment passed → certificate generated → verification page/QR code (e.g. `profyacademy.com/verify/ABC123`)
- Potential organic growth mechanism (shareable completion posts)

### 7.6 Monetization — Freemium with Ads

| Tier | Access | Ads |
|---|---|---|
| Free | Full lesson access (unless further restricted — see open question) | Ads shown |
| Premium | Full lesson access | Ad-free |

- Premium's core value proposition at MVP is **removing ads**, not necessarily unlocking otherwise-locked content — exact content-gating (if any) is still open (see Section 10)
- Monthly and yearly subscription options for Premium
- Ad implementation needs its own technical decision: ad network (e.g. AdMob), placement (between lessons? banner during video? interstitial?), and frequency — not yet specified

### 7.7 Admin Web App (Separate Product)
- Curator/admin auth, distinct from consumer app auth
- Create/edit: categories, subcategories, courses, lessons
- Attach and manage curated YouTube videos per lesson
- Review dashboard for flagged/unavailable videos
- Likely needs curator roles/permissions from the start (see open questions)

---

## 8. Screens

**Note:** Consumer web app screens are assumed to mirror the mobile app 1:1 (same flow, browser-responsive layout) unless a web-specific difference is decided later — see open questions.

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

**Bottom nav:** Home · Learn · Library · Profile

### Admin Web App
| Screen | Purpose |
|---|---|
| Login | Curator/admin auth |
| Taxonomy Manager | Create/edit categories, subcategories, courses |
| Lesson Editor | Create lesson content fields (title, description, explanation, objectives, examples, exercises, quizzes) |
| Video Curation | Search notes, candidate videos, select primary + alternates, attach to lesson |
| Review Dashboard | Flagged/unavailable videos needing replacement |

---

## 9. Technical Notes

- **Video:** YouTube IFrame API for embedded playback (mobile app); store `youtube_video_id`, title, channel, curator status, last-reviewed date per lesson
- **Taxonomy:** recursive category model (`parent_id`)
- **Stack (per known preferences):** Go backend, TypeScript/React or Flutter for mobile, PostgreSQL, Redis, Docker
- **Consumer web app:** separate frontend codebase (likely TypeScript/React), same backend API, shares consumer auth with mobile
- **Admin web app:** separate frontend codebase (likely React/TypeScript), same backend API, separate auth/role layer (curator vs. consumer user)
- **AI Teacher:** text-context Q&A grounded strictly in lesson fields — no video transcription
- **Ads:** network/placement/frequency not yet decided — needs its own spec pass

---

## 10. Open Questions (Remaining)

1. Does Premium *only* remove ads, or does it also unlock content that's restricted on Free (e.g. advanced-level lessons)?
2. Which ad network, and what placement/frequency in the lesson flow?
3. What does the completion-tracking data model need to capture now so Phase 2 certificates don't require a migration (e.g. quiz scores, timestamps, attempt counts)?
4. Who are the curators day-to-day — solely Profy, a small team, or does the admin app need role-based review/approval from the start?
5. Does the consumer web app need to ship simultaneously with mobile at MVP, or can it follow after mobile launches?
6. Does the web app differ from mobile in any way (e.g. richer AI Teacher chat on larger screens, different ad placement), or is it a strict feature mirror?
7. Service boundaries: monolith with clearly separated internal modules, or genuinely separate deployable services (e.g. taxonomy/lessons, AI Teacher, video curation, admin operations)? Either is acceptable as long as the failure-isolation principle in Section 4.1 holds.

---

## 11. Roadmap Summary

| Phase | Scope |
|---|---|
| Phase 1 (MVP) | Mobile app + consumer web app (Technology, Business & Finance, Languages + curated lessons + AI Teacher + completion tracking + Free-with-ads/Premium-ad-free) + Admin web app (taxonomy, lesson, and video curation tools) |
| Phase 2 | Food Production, Agriculture, Construction, Automotive, Beauty & Fashion, Manufacturing, etc. + Certificate generation/verification |
| Phase 3+ | TBD — expanded AI Teacher capability, automated video discovery (human approval retained), quizzes/assessment engine |

---

## Changelog

- **v1.4** — Architecture expanded from two products to three: consumer mobile app, consumer web app, and admin web app. Web app assumed to mirror mobile's feature set at MVP (flagged as open question — not yet confirmed). Two new open questions added on web app timing/scope.
- **v1.3** — Admin panel confirmed as a separate web app (not a mobile-app screen), added as its own product surface with its own screens/auth. Monetization resolved: Free tier shows ads, Premium is ad-free (content-gating still open).
- **v1.2** — Resolved taxonomy, AI Teacher data scope, video curation workflow, certificates (Phase 2, DB designed now), completion tracking moved into MVP.
- **v1.1** — Removed Emotional Mentor feature. Resolved AI Teacher scope: text-context Q&A.
- **v1.0** — Initial draft based on wireframe restructure.

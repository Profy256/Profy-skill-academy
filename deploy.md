# Profy Skill Academy — Deployment Runbook (deploy.md)

**Companion to:** `docs/TECHNICAL_DOC.md` (§8 Environments, §11 Deployment) · **Build order:** `todo.md`
**Scope:** how the system goes from code → running in each environment, for all three frontends
plus the Java backend (`api` Spring Boot app, `worker` Spring Boot app).

> **Primary path (this doc):** one Linux VPS + Docker Compose + Caddy (TLS).
> **Free-tier path (§10):** a $0–7/month MVP stack assembled from free tiers — recommended for launch until revenue justifies the primary path.
> **Alternates:** Fly.io / Railway — same images, managed Postgres/Redis.
> Change this decision before Milestone 10 and update this file (it is the source of truth for ops).

---

## 1. Environments

| Env | Purpose | Data | Where |
|---|---|---|---|
| `local` | Development | dockerized Postgres/Redis, seeded demo content | developer machine (`docker-compose up`) |
| `staging` | Pre-release QA, webhook testing | throwaway DB, Stripe **test** mode, test AI key | small VPS or Fly.io app, `staging.profyacademy.com` |
| `production` | Live learners | real DB, Stripe **live** mode, production AI key | VPS, `profyacademy.com` + `api.profyacademy.com` |

Rules:
- **Staging first, always.** No deploy goes to production without passing the staging smoke test (§9).
- Migrations run against staging before production, never skip the order.
- Stripe has two separate webhook endpoints (test + live) — configure both once (§6).

---

## 2. Server Prerequisites (production VPS)

- Ubuntu 22.04+ LTS, 2 vCPU / 4 GB RAM minimum (api + worker + Caddy live here; DB is managed)
- Docker Engine + Docker Compose plugin installed
- DNS records pointing to the server:
  - `profyacademy.com`, `www.profyacademy.com` → web app
  - `api.profyacademy.com` → backend API
  - `admin.profyacademy.com` → admin app
  - `staging.profyacademy.com` (+ subdomains) → staging clone
- Caddy handles automatic Let's Encrypt TLS for all hostnames
- Firewall: allow 80/443, SSH only; Postgres/Redis are **never** exposed publicly

---

## 3. Environment Variables (complete reference)

Source of truth: `backend/.env.example`. Secrets live in the deployment secret store
(Doppler / `docker-compose` env files with `600` perms / Fly secrets) — **never in git**.

| Var | Used by | Example / Notes |
|---|---|---|
| `DATABASE_URL` | api, worker, migrate | `postgres://profy:•••@db-host:5432/profy?sslmode=require` |
| `REDIS_URL` | api, worker | `redis://redis-host:6379/0` |
| `JWT_SECRET` | api | strong random 32+ bytes; **rotate = all sessions die**, plan it |
| `PORT` | api | `8080` |
| `APP_ENV` | api | `local` / `staging` / `production` — toggles CORS + log verbosity |
| `AI_BASE_URL` | api | e.g. `https://openrouter.ai/api/v1` (any OpenAI-compatible host) |
| `AI_API_KEY` | api | provider key (OpenRouter / OpenAI / Gemini-compat) |
| `AI_MODEL` | api | e.g. a mid-tier cheap chat model; configurable = swappable per D4 |
| `AI_FREE_DAILY_LIMIT` | api | default `20` |
| `AI_PREMIUM_DAILY_LIMIT` | api | default `200` |
| `STRIPE_SECRET_KEY` | api | `sk_live_…` / `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | api | `whsec_…` per-endpoint secret |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | api | Stripe Price IDs created in §6 |
| `REVENUECAT_WEBHOOK_AUTH` | api | shared secret checked on RevenueCat webhook |
| `WEB_ORIGIN` / `ADMIN_ORIGIN` | api | CORS allowlist, e.g. `https://profyacademy.com` |
| `ADMOB_APP_ID` | mobile | reserved (D6 — placeholder ads until network chosen) |
| `SENTRY_DSN_*` | all clients | optional, Milestone 10 |

Client build config (injected at **build time**, not runtime):
- Mobile: `--dart-define=API_BASE_URL=…`, `ADMOB_APP_ID=…`
- Web/admin: `VITE_API_BASE_URL=…`

---

## 4. Backend Release Process

The `api` and `worker` are **independent releases** (failure-isolation, TECHNICAL_DOC §2.1).
One can ship without the other; neither takes the other down.

```bash
# 1. Build & push images (CI does this on tagged releases; manual fallback shown)
docker build -t ghcr.io/profy256/profy-api:v1.4.0 backend/
docker build -t ghcr.io/profy256/profy-worker:v1.4.0 backend/
docker push ghcr.io/profy256/profy-api:v1.4.0
docker push ghcr.io/profy256/profy-worker:v1.4.0

# 2. Run migrations (Flyway, idempotent, versioned)
docker compose run --rm migrate up        # staging first, then production

# 3. Deploy api (rolling: new container up → health check → old container down)
docker compose pull api && docker compose up -d api
curl -fsS https://api.profyacademy.com/healthz     # must 200 before proceeding

# 4. Deploy worker
docker compose pull worker && docker compose up -d worker
docker compose logs --tail=50 worker               # confirm job loop started
```

Migration rules:
- **Backwards-compatible migrations only**: never drop/rename a column in the same release
  that stops using it. Two-step: add new → deploy code → remove old in a later release.
- `migrate down` is for emergencies only; prefer forward-fix.
- If a migration fails halfway: stop, restore from last backup (§8), investigate — do not re-run blind.

Rollback:
```bash
docker compose up -d api --no-deps --scale api=0 && \
docker compose up -d ghcr.io/profy256/profy-api:v1.3.9   # previous tag
# DB: forward-fix if possible; restore backup if the migration itself broke data
```

---

## 5. Web & Admin Releases (static builds)

Both are Vite static bundles served by Caddy, built in CI:

```bash
cd apps/web    && pnpm i && pnpm build   # → apps/web/dist
cd apps/admin  && pnpm i && pnpm build   # → apps/admin/dist
# rsync/scp dist/ to server webroot, then caddy reload (zero-downtime for static)
```

- Deploy web and admin **independently** — neither depends on the other's release.
- SPA routing: Caddy `try_files {path} /index.html` per site block.
- Cache rule: hashed assets `max-age=31536000, immutable`; `index.html` `no-cache`.
- If a web release requires a new API endpoint, ship **api first** (endpoints are
  additive per OpenAPI), then the web bundle.

---

## 6. Third-Party Setup (one-time per environment)

### Stripe (web subscriptions)
1. Create Product "Profy Premium" → two recurring Prices: monthly, yearly → copy Price IDs into `STRIPE_PRICE_*`.
2. Webhook endpoint: `https://api.profyacademy.com/api/v1/billing/stripe/webhook` — events: `subscription.created`, `subscription.updated`, `subscription.deleted`, `invoice.paid`, `invoice.payment_failed` → copy signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Test mode first on staging with `stripe listen --forward-to` locally (Milestone 8 DoD).

### RevenueCat (mobile IAP)
1. Create app entries (Play Store + App Store) in RevenueCat, link store products (monthly/yearly).
2. Configure server webhook → `https://api.profyacademy.com/api/v1/billing/revenuecat/webhook` with `REVENUECAT_WEBHOOK_AUTH` shared secret.
3. Sandbox-test purchases on both stores before closed testing.

### AI provider
Set `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`. Verify with:
```bash
curl -fsS -X POST https://api.profyacademy.com/api/v1/lessons/<id>/ai/chat \
  -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"message":"What is a variable?"}'
```
Switching providers later = env change + redeploy (no code, D4).

### YouTube player
No server key needed: playback is client-side IFrame embed; availability checking uses
public oEmbed (worker). If quota ever demands the Data API, add `YOUTUBE_API_KEY` then.

---

## 7. Mobile Store Releases

Per release train (align with `X-App-Version` support in the API):

1. Bump `pubspec.yaml` version (`1.x.y+build`).
2. Android: `flutter build appbundle --dart-define=API_BASE_URL=https://api.profyacademy.com` → upload to **Play Internal testing** → promote: internal → closed → production.
3. iOS: `flutter build ipa` → **TestFlight** → App Store review → release.
4. First release milestone (10): store listings, privacy policy URL, data-safety forms (collects email; no ads data until AdMob wired).
5. Keep API backward compatible ≥ 2 app versions: users lag on updates; the API must
   serve old clients until their forced-update threshold (§5 conventions in TECHNICAL_DOC).

---

## 8. Operations

**Health & monitoring**
- `GET /healthz` (api) — uptime monitor (Better Stack / UptimeRobot) pings every 60s; alert on 3 failures.
- Worker: expose liveness log line each job cycle; alert if silent > 26h (daily job).
- Logs: JSON to stdout → `docker compose logs` now; ship to Loki/Papertrail when volume justifies.

**Backups (production)**
- Managed Postgres daily snapshot + weekly full export via `pg_dump` to off-site storage (S3/B2), 30-day retention.
- **Free-path caveat:** Neon free plan has no scheduled backups — run the weekly `pg_dump` (cron on the VPS, dumped to Cloudflare R2 free tier, 10 GB) as the only safety net until upgrading. Content data is re-creatable from the admin app, so the critical payloads are `users`, `progress`, `subscriptions`.
- Quarterly restore drill: restore a dump into staging and run the smoke test (§9). A backup is only real once restored.

**TLS & domains** — Caddy auto-renews Let's Encrypt; alert on cert-expiry monitor as backstop.

**Security ops** — rotate `JWT_SECRET`/AI/Stripe keys on staff change; review `audit_log` monthly; keep Docker + host patched (`unattended-upgrades`).

---

## 9. Post-Deploy Smoke Test (run after every production deploy)

- [ ] `GET https://api.profyacademy.com/healthz` → 200
- [ ] Web loads at `profyacademy.com`; category grid shows **only** Phase-1 categories
- [ ] Register new user (web) → browse → open lesson → video plays
- [ ] Ask AI Teacher → grounded reply; (negative) with AI key disabled in staging → `503 ai_unavailable`, lesson still works
- [ ] Complete a lesson → appears in Library + continue-learning
- [ ] Admin login at `admin.profyacademy.com` → create/edit a lesson → visible on web after cache TTL
- [ ] Stripe test (staging only): checkout → entitlement flips within 60s → ads disappear
- [ ] Mobile smoke (staging build): same journey via TestFlight/internal track

---

## 10. Free-Tier Deployment Path (recommended at MVP)

Every layer has a credible free option in 2026. Researched limits below (Sept 2026 — **these change often; re-verify before relying on them**).

| Layer | Free service | Free allowance | Watch out for |
|---|---|---|---|
| API + worker | **Oracle Cloud Always Free** VPS (ARM, up to 4 OCPU/24 GB) — genuinely $0 forever. Fallbacks: Koyeb free service, Railway $5 Hobby | Runs api + worker + Caddy 24/7 | Oracle signup friction/capacity quirks; Koyeb/Render **sleep or scale-to-zero** → cold starts are bad for a mobile API |
| Postgres | **Neon** free plan | 0.5 GB storage, 100 CU-hours/month/project, 100 projects, scale-to-zero after ~5 min idle | 100 CU-h ≠ 24/7 (0.25 CU all month = 180 CU-h). Fine because DB sleeps when idle; heavy caching (Upstash) keeps compute hours down. Cold-start ~0.5–1s on first query after idle |
| Cache / rate limits | **Upstash** Redis free | 256 MB, 10k commands/day (check current) | Command cap is per *command* — batch pipeline ops; entitlement cache TTL 60s is well within it |
| Web + Admin frontends | **Cloudflare Pages** (or Netlify) free | Unlimited static sites, free TLS, CDN | Set `WEB_ORIGIN`/`ADMIN_ORIGIN` to the Pages URLs; SPA redirects config needed |
| AI Teacher | **Google AI Studio (Gemini)** free tier via **OpenAI-compatible endpoint** | ~5–15 RPM, low hundreds of req/day (volatile — limits were cut in Dec 2025 and differ per account) | Free tier may use data for training — fine (we send lesson text + question, no PII). Limits fluctuate → our circuit breaker + `503 ai_unavailable` degradation absorbs this gracefully |
| AI fallback / overflow | **OpenRouter** free models | 50 req/day free; **1,000 req/day after a one-time $10 credit** (credits never expire) | The $10 top-up is the cheapest reliable unlock in the whole stack |
| Payments | Stripe / RevenueCat | No monthly fee — Stripe ~2.9%+30¢/txn; RevenueCat free to $2.5k/mo tracked revenue | Test mode is unlimited-free |
| CI / errors | GitHub Actions (public repo: free; private: 2k min/mo), **Sentry** free | ~5k errors/mo | Enough at MVP |

**Realistic monthly total: $0** (Oracle free VPS + Neon + Upstash + Cloudflare Pages + Gemini free), or **~$7–15** if you buy the $10 OpenRouter credit once and rent a tiny paid VPS (Hetzner CX22 ≈ €4/mo) instead of Oracle.

### Free-path deployment map

```
Cloudflare Pages (web) ─┐
Cloudflare Pages (admin)─┤
Flutter apps ───────────┤
                        ▼
   Oracle Free VPS: Caddy → api container + worker container
                        │
        ┌───────────────┼─────────────────┐
        ▼               ▼                 ▼
   Neon (Postgres)  Upstash (Redis)   Gemini free tier
                                      (OpenRouter overflow)
```

Same env vars as §3; only hosts differ (`DATABASE_URL` → Neon, `REDIS_URL` → Upstash with TLS, `AI_BASE_URL` → Gemini's OpenAI-compatible endpoint). Docker Compose on the VPS shrinks to just `api` + `worker` + `caddy` services.

### Free-tier trade-offs (accepted at MVP)

1. **Cold starts.** Neon sleeps after ~5 min idle (first query ~0.5–1s slower); Oracle/ARM free VMs are always-on so the API itself has no cold start. Mitigation: the web app warms the API on load; DB cold-start is one-time per idle window.
2. **AI limits are the first ceiling.** Free Gemini supports launch scale (roughly low hundreds of active askers/day). When hit, users see the graceful `ai_unavailable` state — the lesson still works. **Upgrade trigger:** consistent breaker trips → $10 OpenRouter top-up (1k req/day) → paid Gemini tier.
3. **No SLAs.** Free tiers have none. Acceptable pre-revenue; the smoke test (§9) + uptime monitor alert you fast.
4. **Neon storage 0.5 GB** is plenty for years of taxonomy/lesson text; video is on YouTube, images are URLs. Watch `ai_chat_messages` growth; prune or move to text files if it balloons.

### Upgrade triggers (when free stops being free)

| Signal | Move | Cost |
|---|---|---|
| AI breaker trips weekly | OpenRouter $10 credit or Gemini paid tier | $10 once / ~$5–20 mo |
| Neon CU-hours exhausted or > 5 GB | Neon Launch plan | ~$5–19 mo |
| Upstash command cap hit | Upstash pay-as-you-go | ~$1–5 mo |
| Revenue > ~$500/mo or Oracle eviction | Primary path: real VPS (Hetzner/DigitalOcean) | $5–12 mo |

**Migrate-up story:** every layer here is swappable without code changes — Postgres URL swap, Redis URL swap, AI env swap (D4), static frontends just re-point. The VPS path (§4) and this path share binaries, images, and runbook.

---

## 11. Hosted Alternatives (Fly.io / Railway)

Fly.io no longer has a meaningful free tier (2026). If you prefer PaaS ergonomics over the VPS/free path: `fly deploy` or Railway Hobby ($5/mo) with managed Postgres/Redis, `fly secrets set …` for §3 vars. Worker stays a single instance (jobs are non-concurrent by design). Only worth it when ops time matters more than the $5.

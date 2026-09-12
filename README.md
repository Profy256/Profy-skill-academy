# Profy Skill Academy

**Learn Anything. Anytime. Anywhere.**

A mobile learning platform for practical, applied skills — starting with Technology, Business & Finance, and Languages. Features curated video lessons with an AI Teacher available inside every lesson to answer questions in real time.

---

## Features

- **Curated Video Lessons** — All content human-curated, no auto-surfaced videos
- **AI Teacher** — Ask questions and get answers scoped to the current lesson
- **Progress Tracking** — Save lessons, track course completion, view stats
- **Freemium Model** — Free tier with ads, Premium ad-free experience
- **Cross-Platform** — Mobile app, consumer web app, and admin panel

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java / Spring Boot |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Mobile | Flutter |
| Web (Consumer) | Next.js (TypeScript) |
| Web (Admin) | Next.js (TypeScript) |
| AI | OpenRouter (GPT-4o-mini) |
| Payments | Stripe, RevenueCat |
| Infrastructure | Docker Compose |

## Project Structure

```
profy-skill-academy/
├── backend/          # Spring Boot API + worker
├── apps/
│   ├── mobile/       # Flutter learner app
│   ├── web/          # Next.js consumer web app
│   └── admin/        # Next.js curator/admin panel
├── packages/         # Shared packages
├── docs/             # Documentation
├── docker-compose.yml
└── .env.example
```

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Java 17+ (for local backend dev)
- Flutter SDK (for mobile dev)
- Node.js 18+ (for web/admin apps)

### Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/Profy256/Profy-skill-academy.git
cd Profy-skill-academy

# 2. Create your .env from the example
cp .env.example .env

# 3. Start everything
docker compose up --build
```

Services will be available at:

| Service | URL |
|---------|-----|
| API | http://localhost:8082 |
| Consumer Web | http://localhost:3002 |
| Admin Panel | http://localhost:3003 |
| PostgreSQL | localhost:5434 |
| Redis | localhost:6379 |

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `JWT_SECRET` — Signing secret for auth tokens
- `AI_API_KEY` — OpenRouter API key for AI Teacher
- `STRIPE_SECRET_KEY` — Stripe payment processing
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook verification
- `REVENUECAT_WEBHOOK_AUTH` — RevenueCat webhook auth

## API

The backend exposes a REST API on port 8080 (8082 externally in Docker). Documentation is available at:

```
http://localhost:8082/redoc
```

## License

Proprietary — Profy256

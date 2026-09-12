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

---

## Running Individual Services

### Backend (Spring Boot API)

**Prerequisites:** Java 17+, Maven, PostgreSQL, Redis

```bash
# Start only the database services
docker compose up -d postgres redis

# Run the API server
cd backend
./mvnw spring-boot:run

# Or build the JAR and run
./mvnw clean package -DskipTests
java -jar target/profy-skill-academy-0.1.0.jar
```

API runs on `http://localhost:8080` by default.

**Run tests:**

```bash
cd backend
./mvnw test
```

---

### Consumer Web App (Next.js)

**Prerequisites:** Node.js 18+

```bash
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

Web app runs on `http://localhost:3000`.

**Build for production:**

```bash
npm run build
npm start
```

---

### Admin Panel (Next.js)

**Prerequisites:** Node.js 18+

```bash
cd apps/admin

# Install dependencies
npm install

# Start development server
npm run dev
```

Admin panel runs on `http://localhost:3000` (use a different port if web is also running).

**Build for production:**

```bash
npm run build
npm start
```

---

### Mobile App (Flutter)

**Prerequisites:** Flutter SDK 3.13+, Android Studio or Xcode

```bash
cd apps/mobile

# Install dependencies
flutter pub get

# Check for any issues
flutter doctor

# Run on connected device or emulator
flutter run

# Run on specific platform
flutter run -d android
flutter run -d ios
flutter run -d chrome
```

**Build release versions:**

```bash
# Android APK
flutter build apk

# Android App Bundle (for Play Store)
flutter build appbundle

# iOS (requires macOS + Xcode)
flutter build ios
```

**Run tests:**

```bash
flutter test
```

---

## API Documentation

The backend exposes a REST API. Documentation is available at:

```
http://localhost:8080/redoc
```

OpenAPI spec is located at `backend/api/openapi.yaml`.

## License

Proprietary — Profy256

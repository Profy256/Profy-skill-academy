# CampusLibrary Integration Guide

> Connecting Profy Skill Academy with CampusLibrary (www.campuslibrary.xyz)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [What's Been Done (Profy Side)](#whats-been-done-profy-side)
3. [What You Need to Build (CampusLibrary API)](#what-you-need-to-build-campuslibrary-api)
4. [API Contract](#api-contract)
5. [Data Flow](#data-flow)
6. [Profy Backend Integration](#profy-backend-integration)
7. [Admin Panel Management](#admin-panel-management)
8. [Consumer Frontend (Web)](#consumer-frontend-web)
9. [Consumer Frontend (Mobile)](#consumer-frontend-mobile)
10. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

```
┌──────────────────────┐         ┌──────────────────────────┐
│   CampusLibrary      │◄──API──►│   Profy Backend          │
│   www.campuslibrary  │         │   (Spring Boot)          │
│                      │         │                          │
│  - Books database    │         │  - CampusLibraryClient   │
│  - PDF/EPUB storage  │         │  - CampusLibraryService  │
│  - Search index      │         │  - campus_books cache    │
│  - Categories        │         │  - campus_book_settings  │
└──────────────────────┘         └──────────┬───────────────┘
                                            │
                              ┌─────────────┼─────────────┐
                              │             │             │
                         ┌────▼────┐  ┌─────▼─────┐  ┌───▼────┐
                         │ Web App │  │ Mobile App│  │ Admin  │
                         │ (Next.js│  │ (Flutter) │  │ Panel  │
                         └─────────┘  └───────────┘  └────────┘
```

**Key principle:** CampusLibrary is the single source of truth for books. Profy caches metadata locally for performance but never stores book content — all reading happens through CampusLibrary.

---

## What's Been Done (Profy Side)

### GEO / SEO (Completed)

- **robots.ts** updated with 15+ AI crawler user agents (GPTBot, ClaudeBot, PerplexityBot, Bingbot, YouBot, CCBot, meta-externalagent, MistralAI-User, Applebot-Extended, Amazonbot, YandexBot, bravebot, elastic-crawler, ia_archiver, etc.)
- All crawlers allowed full access except `/api/`, `/admin/`, `/profile/`
- Sitemap generated at `/sitemap.xml`
- Structured data components ready (JSON-LD for Course, Lesson, FAQ, Breadcrumbs, Organization, Website)

### Backend (Completed — ready to extend)

Existing resource system that can be extended:

| Component | Status |
|-----------|--------|
| `Resource` entity + CRUD | Done |
| `ResourceService` with taxonomy enrichment | Done |
| Admin resource management (create/update/delete) | Done |
| Public resource listing (`GET /api/v1/resources`) | Done |
| PDF upload simulation (admin UI exists, no storage backend) | Partial |

### What Exists Now

```
Resources = files (PDFs) attached to courses in the taxonomy
Library   = user bookmarks (saved lessons)
```

CampusLibrary will add:

```
CampusLibrary Books = external books from campuslibrary.xyz, browsable + readable
```

---

## What You Need to Build (CampusLibrary API)

### Step 1: CampusLibrary Database Schema

```sql
-- Books table
CREATE TABLE books (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    author          VARCHAR(300) NOT NULL,
    description     TEXT,
    cover_url       VARCHAR(1000),
    isbn            VARCHAR(20),
    category_id     UUID REFERENCES categories(id),
    language        VARCHAR(10) DEFAULT 'en',
    page_count      INTEGER,
    published_year  INTEGER,
    formats         JSONB DEFAULT '["pdf"]',  -- ["pdf", "epub"]
    is_available    BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    icon        VARCHAR(50),
    sort_order  INTEGER DEFAULT 0
);

-- Book files (for PDF/EPUB storage)
CREATE TABLE book_files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
    format      VARCHAR(10) NOT NULL,  -- 'pdf', 'epub'
    file_url    VARCHAR(1000) NOT NULL,
    file_size   BIGINT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Book chapters (optional, for structured reading)
CREATE TABLE book_chapters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    page_start  INTEGER,
    page_end    INTEGER
);

CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_title ON books USING gin(to_tsvector('english', title));
CREATE INDEX idx_books_author ON books USING gin(to_tsvector('english', author));
```

### Step 2: CampusLibrary REST API Endpoints

#### Books

```
GET /api/v1/books
  Query params:
    page       (default: 1)
    limit      (default: 20, max: 100)
    category   (slug, optional)
    language   (iso code, optional)
    search     (full-text search, optional)
    sort       (relevance|title|newest|popular, default: relevance)
  
  Response:
  {
    "books": [BookObject],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 342,
      "totalPages": 18
    }
  }

GET /api/v1/books/:id
  Response: BookObject

GET /api/v1/books/:id/content
  Response:
  {
    "book": BookObject,
    "chapters": [{ id, title, sortOrder, pageStart, pageEnd }],
    "files": [{ format, fileSize, fileUrl }]
  }

GET /api/v1/books/:id/file
  Query params:
    format  (pdf|epub)
  Response: Redirect to file URL or streaming response
```

#### Categories

```
GET /api/v1/categories
  Response:
  {
    "categories": [
      { "id", "name", "slug", "description", "icon", "bookCount" }
    ]
  }
```

#### Search

```
GET /api/v1/search
  Query params:
    q        (search term, required)
    page     (default: 1)
    limit    (default: 20)
    type     (books|all, default: books)
  
  Response:
  {
    "results": [BookObject],
    "total": 15,
    "query": "algorithms"
  }
```

#### Authentication (for Profy)

```
GET /api/v1/auth/verify
  Headers: Authorization: Bearer <profy-service-token>
  
  Response:
  { "valid": true, "service": "profy-skill-academy" }
```

### Step 3: Book Object Shape

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Introduction to Algorithms",
  "author": "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
  "description": "A comprehensive textbook covering a broad range of algorithms in depth...",
  "coverUrl": "https://campuslibrary.xyz/covers/intro-algorithms.jpg",
  "isbn": "978-0262033848",
  "category": {
    "id": "...",
    "name": "Computer Science",
    "slug": "computer-science"
  },
  "language": "en",
  "pageCount": 1312,
  "publishedYear": 2009,
  "formats": ["pdf"],
  "isAvailable": true,
  "rating": 4.5,
  "ratingCount": 1280,
  "downloadCount": 45230,
  "createdAt": "2026-01-15T00:00:00Z"
}
```

### Step 4: Rate Limiting & Auth

CampusLibrary should:

- Issue a **service token** for Profy (long-lived API key, not user tokens)
- Rate limit Profy to ~1000 requests/hour (adjust as needed)
- Return proper error codes:

```json
// 429 Too Many Requests
{ "error": "rate_limited", "retryAfter": 60 }

// 401 Unauthorized
{ "error": "unauthorized", "message": "Invalid or missing service token" }

// 404 Not Found
{ "error": "not_found", "message": "Book not found" }
```

---

## API Contract

### Profy → CampusLibrary (requests)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/books` | GET | List books (paginated, filterable) |
| `/api/v1/books/:id` | GET | Single book detail |
| `/api/v1/books/:id/content` | GET | Book chapters + file URLs |
| `/api/v1/categories` | GET | All categories with book counts |
| `/api/v1/search?q=...` | GET | Full-text search |

### Profy Backend → Frontend (responses)

#### `GET /api/v1/campus-books`

```json
{
  "books": [
    {
      "id": "uuid",
      "campusBookId": "uuid-from-campuslibrary",
      "title": "Introduction to Algorithms",
      "author": "Thomas H. Cormen",
      "description": "...",
      "coverUrl": "https://campuslibrary.xyz/...",
      "category": "Computer Science",
      "categorySlug": "computer-science",
      "language": "en",
      "pageCount": 1312,
      "publishedYear": 2009,
      "formats": ["pdf"],
      "rating": 4.5,
      "isPremium": false,
      "isAvailable": true
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 342 }
}
```

#### `GET /api/v1/campus-books/:id`

```json
{
  "id": "uuid",
  "campusBookId": "uuid",
  "title": "...",
  "author": "...",
  "description": "...",
  "coverUrl": "...",
  "category": "...",
  "language": "en",
  "pageCount": 1312,
  "publishedYear": 2009,
  "formats": ["pdf"],
  "rating": 4.5,
  "isPremium": false,
  "isAvailable": true,
  "chapters": [
    { "id": "uuid", "title": "Chapter 1: Foundations", "pageStart": 1, "pageEnd": 30 }
  ]
}
```

---

## Data Flow

### Book Browsing Flow

```
1. User opens "Campus Library" tab
2. Frontend calls GET /api/v1/campus-books?page=1&category=computer-science
3. Profy Backend:
   a. Checks Redis cache (key: campus-books:list:{params})
   b. If cache miss → calls campuslibrary.xyz/api/v1/books?...
   c. Merges response with campus_book_settings (premium flags from admin)
   d. Caches result in Redis (TTL: 5 minutes)
   e. Returns enriched response
4. Frontend renders book grid with covers, titles, premium badges
```

### Book Reading Flow

```
1. User clicks a book
2. Frontend calls GET /api/v1/campus-books/:id
3. Profy Backend:
   a. Fetches book detail from campuslibrary.xyz/api/v1/books/:id
   b. Applies admin settings (premium flag)
   c. Returns enriched book + chapter list
4. Frontend shows book detail modal
5. User clicks "Read"
6. If premium → check subscription → if free or subscribed:
   a. Frontend calls GET /api/v1/campus-books/:id/read?format=pdf
   b. Profy Backend:
      - Calls campuslibrary.xyz/api/v1/books/:id/file?format=pdf
      - CampusLibrary returns a signed/temporary URL
      - Profy passes URL to frontend
   c. Frontend opens PDF viewer / page-flip viewer with the URL
```

### Admin Premium Toggle Flow

```
1. Admin opens "Campus Library" in admin panel
2. Admin searches/browses books from CampusLibrary
3. Admin toggles "Premium" switch on a book
4. Frontend calls PUT /api/v1/admin/campus-books/:campusBookId/settings
   Body: { "isPremium": true }
5. Profy Backend:
   a. Upserts campus_book_settings row
   b. Invalidates relevant cache keys
6. Next time a user browses, that book shows premium badge
```

---

## Profy Backend Integration

### New Migration (V13)

```sql
-- CampusLibrary book cache + admin settings
CREATE TABLE campus_books (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_book_id    VARCHAR(100) UNIQUE NOT NULL,  -- ID from CampusLibrary
    title             VARCHAR(500) NOT NULL,
    author            VARCHAR(300) NOT NULL,
    description       TEXT,
    cover_url         VARCHAR(1000),
    category_slug     VARCHAR(200),
    language          VARCHAR(10) DEFAULT 'en',
    page_count        INTEGER,
    published_year    INTEGER,
    formats           JSONB DEFAULT '["pdf"]',
    rating            NUMERIC(3,1),
    is_available      BOOLEAN DEFAULT true,
    last_synced_at    TIMESTAMPTZ DEFAULT now(),
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campus_book_settings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_book_id    VARCHAR(100) UNIQUE NOT NULL,
    is_premium        BOOLEAN DEFAULT false,
    is_featured       BOOLEAN DEFAULT false,
    custom_note       TEXT,           -- admin can add a note like "Recommended for CS101"
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campus_books_category ON campus_books(category_slug);
CREATE INDEX idx_campus_books_title ON campus_books USING gin(to_tsvector('english', title));
CREATE INDEX idx_campus_books_synced ON campus_books(last_synced_at);
```

### New Java Files

| File | Package | Purpose |
|------|---------|---------|
| `CampusBook.java` | `modules.campus.entity` | JPA entity |
| `CampusBookSettings.java` | `modules.campus.entity` | JPA entity |
| `CampusBookRepository.java` | `modules.campus.repository` | JPA repository |
| `CampusBookSettingsRepository.java` | `modules.campus.repository` | JPA repository |
| `CampusLibraryClient.java` | `modules.campus.service` | HTTP client for CampusLibrary API |
| `CampusLibraryService.java` | `modules.campus.service` | Business logic: fetch, cache, merge |
| `CampusBookController.java` | `modules.campus.controller` | Public API endpoints |
| `AdminCampusBookController.java` | `modules.campus.controller` | Admin management endpoints |

### CampusLibraryClient.java (skeleton)

```java
@Component
public class CampusLibraryClient {

    private final RestTemplate restTemplate;
    private final AppConfig appConfig;

    // GET /api/v1/books?page=&limit=&category=&search=
    public CampusLibraryResponse listBooks(int page, int limit, String category, String search) { ... }

    // GET /api/v1/books/:id
    public CampusBookDto getBook(String campusBookId) { ... }

    // GET /api/v1/books/:id/content
    public CampusBookContentDto getBookContent(String campusBookId) { ... }

    // GET /api/v1/categories
    public List<CampusCategoryDto> getCategories() { ... }

    // GET /api/v1/search?q=...
    public CampusLibraryResponse searchBooks(String query, int page, int limit) { ... }
}
```

### CampusLibraryService.java (skeleton)

```java
@Service
public class CampusLibraryService {

    // List books: CampusLibrary API → merge with admin settings → cache → return
    public CampusBookListResponse listBooks(int page, int limit, String category, String search) {
        // 1. Check Redis cache
        // 2. If miss, call campusLibraryClient.listBooks(...)
        // 3. Merge with campus_book_settings (premium flags)
        // 4. Cache in Redis (TTL: 5 min)
        // 5. Return
    }

    // Get single book: CampusLibrary API → merge settings → return
    public CampusBookResponse getBook(String campusBookId) { ... }

    // Get book content: proxy to CampusLibrary
    public CampusBookContentResponse getBookContent(String campusBookId) { ... }

    // Admin: toggle premium
    @Transactional
    public void setPremium(String campusBookId, boolean isPremium) {
        // Upsert campus_book_settings
        // Invalidate cache
    }

    // Admin: sync books from CampusLibrary
    @Transactional
    public SyncResult syncBooks() {
        // Pull latest books from CampusLibrary
        // Upsert into campus_books table
        // Return count of new/updated/removed
    }
}
```

### Application.yml additions

```yaml
profy:
  # CampusLibrary
  campus-library-base-url: ${CAMPUS_LIBRARY_BASE_URL:https://campuslibrary.xyz}
  campus-library-api-key: ${CAMPUS_LIBRARY_API_KEY:}
```

---

## Admin Panel Management

### New View: CampusLibraryManager.tsx

```
┌─────────────────────────────────────────────────────────┐
│ CAMPUS LIBRARY                              [Sync Now]  │
├──────────┬──────────────────────────────────────────────┤
│ Filters  │  Books Grid                                  │
│          │                                              │
│ Category │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
│ ☐ All    │  │      │  │      │  │      │  │      │   │
│ ☐ CS     │  │ Cover│  │ Cover│  │ Cover│  │ Cover│   │
│ ☐ Lang   │  │      │  │      │  │      │  │      │   │
│ ☐ Math   │  │Title │  │Title │  │Title │  │Title │   │
│          │  │Author│  │Author│  │Author│  │Author│   │
│ Search   │  │ ★4.5 │  │ ★4.2 │  │ ★4.8 │  │ ★3.9 │   │
│ [______] │  │FREE  │  │PREMIUM│ │FREE  │  │FREE  │   │
│          │  └──────┘  └──────┘  └──────┘  └──────┘   │
│          │                                              │
│ Status   │  Page 1 of 18  < 1 2 3 ... 18 >            │
│ ○ All    │                                              │
│ ○ Free   │                                              │
│ ○ Premium│                                              │
└──────────┴──────────────────────────────────────────────┘
```

**Admin capabilities:**
1. Browse all CampusLibrary books (search, filter by category, filter by premium status)
2. Toggle premium per book (switch toggle on each card)
3. Bulk premium: select multiple → "Make Premium" / "Make Free"
4. Sync button: pull latest from CampusLibrary API
5. Featured toggle: mark books as featured for homepage display
6. Custom notes: add admin notes visible to users (e.g., "Required for CS101")

### Admin API Endpoints

```
GET    /api/v1/admin/campus-books                — list (with settings merged)
GET    /api/v1/admin/campus-books/:campusBookId  — detail
PUT    /api/v1/admin/campus-books/:campusBookId/settings  — update premium/featured
POST   /api/v1/admin/campus-books/sync           — sync from CampusLibrary
GET    /api/v1/admin/campus-books/stats           — counts (total, free, premium)
```

---

## Consumer Frontend (Web)

### Updated Library Screen

```
┌─────────────────────────────────────────────────────────┐
│ Library                                                 │
├─────────────────────────────────────────────────────────┤
│ [My Books]  [Campus Library]  [Bookmarks]              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Search: [________________]  Category: [All ▾]          │
│                                                         │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│ │ Cover  │ │ Cover  │ │ Cover  │ │ Cover  │           │
│ │        │ │        │ │        │ │        │           │
│ │ Title  │ │ Title  │ │ Title  │ │ Title  │           │
│ │ Author │ │ Author │ │ Author │ │ Author │           │
│ │ ★4.5   │ │ ★4.2   │ │ ★4.8   │ │ ★3.9   │           │
│ │ FREE   │ │ 🔒 $   │ │ FREE   │ │ FREE   │           │
│ └────────┘ └────────┘ └────────┘ └────────┘           │
│                                                         │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│ │  ...   │ │  ...   │ │  ...   │ │  ...   │           │
│ └────────┘ └────────┘ └────────┘ └────────┘           │
│                                                         │
│ Page 1 of 18  < 1 2 3 ... 18 >                        │
└─────────────────────────────────────────────────────────┘
```

### Book Detail Modal

```
┌─────────────────────────────────────────────────────┐
│                                        [✕]          │
│  ┌──────────┐                                        │
│  │          │  Introduction to Algorithms            │
│  │  Cover   │  Thomas H. Cormen et al.              │
│  │          │                                        │
│  │  1312 pg │  ★★★★☆ 4.5 (1,280 ratings)          │
│  │          │                                        │
│  └──────────┘  Computer Science · English · 2009    │
│                                                     │
│  A comprehensive textbook covering a broad range    │
│  of algorithms in depth, yet makes their design     │
│  and analysis accessible to all levels of readers.  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Chapters:                                   │   │
│  │  1. Foundations (pp. 1-30)                  │   │
│  │  2. Getting Started (pp. 31-66)             │   │
│  │  3. Growth of Functions (pp. 67-112)        │   │
│  │  ...                                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Read PDF]              [Add to My Books]          │
└─────────────────────────────────────────────────────┘
```

### Web API Client Additions

```typescript
// apps/web/src/lib/api.ts

export const campusBooksApi = {
  list: (params: { page?: number; limit?: number; category?: string; search?: string }) =>
    fetch(`/api/v1/campus-books?${new URLSearchParams(params)}`).then(r => r.json()),
  
  get: (id: string) =>
    fetch(`/api/v1/campus-books/${id}`).then(r => r.json()),
  
  getReadUrl: (id: string, format: string) =>
    fetch(`/api/v1/campus-books/${id}/read?format=${format}`).then(r => r.json()),
};
```

---

## Consumer Frontend (Mobile)

### New Screen: CampusLibraryScreen

The mobile app needs a new screen for browsing CampusLibrary books:

**Route:** `/library/books` (accessible from Library tab)

**Features:**
- Horizontal scrollable category chips at top
- Search bar
- Grid of book cards (2 columns)
- Pull-to-refresh
- Infinite scroll pagination
- Book detail bottom sheet
- Premium badge + subscription gate
- "Read" button opens in-app PDF viewer

### New Widget: BookCard

```dart
class BookCard extends StatelessWidget {
  final String title;
  final String author;
  final String? coverUrl;
  final double? rating;
  final bool isPremium;
  final VoidCallback onTap;
  
  // Renders: cover image, title, author, rating stars, premium badge
}
```

### New Provider: campusBooksProvider

```dart
final campusBooksProvider = FutureProvider.autoDispose
    .family<List<CampusBook>, Map<String, String>>((ref, params) async {
  final api = ref.watch(apiClientProvider);
  return api.listCampusBooks(
    page: params['page'] ?? '1',
    category: params['category'],
    search: params['search'],
  );
});
```

---

## Deployment Checklist

### CampusLibrary Side

- [ ] Database schema created (books, categories, book_files, book_chapters)
- [ ] REST API endpoints implemented and tested
- [ ] Service token generated for Profy
- [ ] CORS configured for profyskillacademy.com
- [ ] Rate limiting configured (1000 req/hr for Profy)
- [ ] SSL certificate active on campuslibrary.xyz
- [ ] Initial book catalog imported

### Profy Backend

- [ ] V13 migration applied
- [ ] `CAMPUS_LIBRARY_BASE_URL` env var set
- [ ] `CAMPUS_LIBRARY_API_KEY` env var set
- [ ] CampusLibraryClient tested against real CampusLibrary API
- [ ] Redis caching working
- [ ] Admin endpoints tested
- [ ] Public endpoints tested

### Profy Admin

- [ ] CampusLibraryManager component built
- [ ] CampusLibrary nav item added to sidebar
- [ ] Premium toggle working
- [ ] Sync button working
- [ ] Book detail modal working

### Profy Web

- [ ] Library screen updated with "Campus Library" tab
- [ ] Book grid rendering with covers
- [ ] Search + category filter working
- [ ] Book detail modal with chapters
- [ ] PDF viewer integrated (pdf.js or similar)
- [ ] Premium gate showing upgrade prompt
- [ ] Free books opening directly

### Profy Mobile

- [ ] CampusLibraryScreen built
- [ ] BookCard widget built
- [ ] CampusBooksProvider working
- [ ] PDF viewer integrated
- [ ] Premium gate working
- [ ] Infinite scroll working

---

## Environment Variables

```bash
# CampusLibrary connection
CAMPUS_LIBRARY_BASE_URL=https://campuslibrary.xyz
CAMPUS_LIBRARY_API_KEY=your-service-token-here

# Optional: Redis TTL for campus book cache (seconds)
CAMPUS_BOOKS_CACHE_TTL=300
```

---

## Future Enhancements

1. **Reading progress sync** — Track which pages user has read across devices
2. **Book recommendations** — "Similar books" based on category + reading history
3. **Offline reading** — Download books for offline access (mobile)
4. **Highlights & notes** — Users can highlight text and add notes
5. **Book clubs** — Group reading with discussion
6. **CampusLibrary Admin** — Manage CampusLibrary itself through Profy admin (if desired)

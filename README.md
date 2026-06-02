# SERA Backend Technical Test

**PT Serasi Autoraya (SERA) — Backend Developer Technical Test**

> NestJS · TypeScript · PostgreSQL · Redis · Bull Queue

**Kandidat:** Bintang Wijaya  
**Email:** bintangwijaya18@gmail.com  
**Demo:** https://sera.bintanx.com  
**API Docs:** https://sera.bintanx.com/api/docs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | NestJS |
| Database | PostgreSQL 15 |
| Cache & Queue | Redis 7 |
| Job Processor | Bull (@nestjs/bull) |
| Auth | JWT (passport-jwt) |
| ORM | TypeORM |
| Testing | Jest + Supertest |
| Container | Docker + docker-compose |
| Reverse Proxy | Nginx |
| Mail | Nodemailer (SMTP Hostinger) |

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### 1. Clone & Setup

```bash
git clone https://github.com/rhecustein/sera-test
cd sera-test
cp .env.example .env
# Edit .env sesuai konfigurasi lokal
```

### 2. Jalankan Services

```bash
# Start PostgreSQL + Redis + App + Nginx
docker compose up -d

# Atau tanpa Docker (dev mode)
npm install
npm run migration:run
npm run seed
npm run start:dev
```

### 3. Akses

| Service | URL |
|---|---|
| API | http://localhost:60010 |
| Swagger UI | http://localhost:60010/api |
| Health Check | http://localhost:60010/health |
| Metrics | http://localhost:60010/metrics |

---

## Environment Variables

Salin `.env.example` ke `.env` dan isi semua variable:

```env
# App
PORT=60010
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=sera_user
DB_PASS=sera_password
DB_NAME=sera_db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Mail (SMTP Hostinger)
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=your@email.com
MAIL_PASS=your-password
MAIL_FROM=SERA System <noreply@sera.co.id>

# Throttle
THROTTLE_TTL=60000
THROTTLE_LIMIT=60

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## Default Seeder Credentials

```bash
npm run seed
```

| Role | Email | Password |
|---|---|---|
| Admin | admin@sera.test | Admin123! |
| Customer | customer@sera.test | Customer123! |

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register user baru |
| POST | `/auth/login` | Public | Login, return JWT |
| GET | `/auth/me` | JWT | Profile user aktif |

### Products

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/products` | Public | List produk + pagination + search + sort |
| GET | `/products/:id` | Public | Detail produk |
| POST | `/products` | JWT + Admin | Buat produk baru |
| PATCH | `/products/:id` | JWT + Admin | Update parsial produk |
| DELETE | `/products/:id` | JWT + Admin | Soft delete produk |

**Query params GET /products:**
- `page`, `limit` — pagination
- `search` — filter nama produk
- `sort` — field sort (`name`, `price`, `stock`, `createdAt`)
- `order` — `asc` / `desc`

### Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/orders` | JWT + Customer | Buat order baru |
| GET | `/orders` | JWT | History order (customer: milik sendiri, admin: semua) |
| GET | `/orders/:id` | JWT | Detail order + items |

### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Status DB + Redis |
| GET | `/metrics` | Public | Request count, error rate, latency, queue stats |

---

## Standard Response Format

```json
// Success
{
  "success": true,
  "statusCode": 200,
  "message": "Products fetched successfully",
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 }
}

// Error
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "message": "name must not be empty" }],
  "requestId": "uuid-v4",
  "timestamp": "2026-06-03T10:00:00.000Z"
}
```

---

## Database

### Migrations

```bash
# Jalankan semua migration
npm run migration:run

# Buat migration baru
npm run migration:generate -- src/database/migrations/NamaFile

# Revert migration terakhir
npm run migration:revert
```

### Schema

6 tabel: `users`, `products`, `orders`, `order_items`, `activity_logs`, `failed_jobs`

Lihat detail di [`docs/ERD.md`](docs/ERD.md)

**Keputusan desain:**
- **UUID PK** — distributed-safe, tidak bisa di-enumerate
- **Soft delete** — `deleted_at` timestamp, audit trail terjaga
- **Price snapshot** — `order_items.price` menyimpan harga saat transaksi, bukan harga current
- **Idempotency key** — UNIQUE constraint di `orders` mencegah duplikasi di level DB

---

## Async Queue

Setelah `POST /orders` berhasil, 3 job di-dispatch ke Redis Bull Queue secara concurrent:

| Queue | Job | Handler |
|---|---|---|
| `order-email` | `send-invoice` | Kirim HTML invoice via SMTP |
| `order-log` | `save-log` | Simpan ke tabel `activity_logs` |
| `order-notif` | `send-notification` | Kirim notifikasi WhatsApp (placeholder) |

**Config:** `attempts: 3`, `backoff: exponential (2s → 4s → 8s)`, `removeOnFail: false`

**Dead letter:** Job gagal setelah 3 attempt di-persist ke tabel `failed_jobs` di PostgreSQL.

**Idempotency:** Setiap processor cek Redis SETNX sebelum proses — job yang sama tidak diproses dua kali.

Lihat detail di [`docs/ASYNC_FLOW.md`](docs/ASYNC_FLOW.md)

---

## Testing

```bash
# Unit test
npm run test

# Coverage report
npm run test:cov
# Output: coverage/lcov-report/index.html

# E2E test
npm run test:e2e
```

**Target coverage:** ≥ 70% (statements, lines, functions)

**Test files:** 18 `.spec.ts` mencakup semua module — auth, products, orders, queue processors, interceptors, filters, middleware.

---

## Security

| Fitur | Implementasi |
|---|---|
| Rate Limiting | `@nestjs/throttler` — 60 req/menit per IP (HTTP 429) |
| Password Hashing | `bcrypt` saltRounds:12 |
| SQL Injection Prevention | TypeORM parameterized queries |
| CORS | Whitelist origin dari `CORS_ORIGIN` env |
| Secure Headers | `helmet` middleware |
| Secret Management | `.env` + `.gitignore` — tidak ada secret hardcode |
| JWT Expiry | Token expire 1 jam |
| Input Validation | `class-validator` + `ValidationPipe` global |

---

## Observability

**Structured Logging (Winston):**
```json
{
  "timestamp": "2026-06-03T10:00:00.000Z",
  "level": "info",
  "requestId": "550e8400-...",
  "method": "POST",
  "path": "/orders",
  "statusCode": 201,
  "responseTime": "45ms",
  "userId": "user-uuid",
  "message": "Order created successfully"
}
```

**Metrics endpoint `GET /metrics`:**
```json
{
  "total_requests": 1420,
  "total_errors": 12,
  "error_rate_percent": 0.85,
  "avg_response_time_ms": 87,
  "queue_pending": 3,
  "queue_failed": 0,
  "database_pool_active": 5,
  "uptime_seconds": 86400
}
```

---

## Docker

```bash
# Build + start semua service
docker compose up -d

# Lihat logs
docker compose logs -f app

# Stop
docker compose down
```

**Services:**

| Service | Port | Image |
|---|---|---|
| app | 60010 | Node.js 20 Alpine (multi-stage build) |
| postgres | 5433 | postgres:15-alpine |
| redis | 6379 | redis:7-alpine (AOF enabled) |
| nginx | 80 | nginx:alpine |

---

## Repository Structure

```
sera-test/
├── src/
│   ├── auth/              # Register, Login, JWT, Guards
│   ├── users/             # User entity & service
│   ├── products/          # CRUD Product + pagination + search
│   ├── orders/            # Create Order + history + detail
│   ├── queue/             # Bull producers & processors
│   │   ├── entities/      # FailedJob entity
│   │   ├── jobs/          # OrderJobsProducer
│   │   └── processors/    # Email, ActivityLog, Notification
│   ├── activity-logs/     # Activity log service
│   ├── common/            # Filters, interceptors, middleware
│   ├── config/            # DB, JWT, Redis, Mail config
│   ├── database/
│   │   ├── migrations/    # 6 migration files
│   │   └── seed.ts        # Seeder admin + customer
│   ├── health/            # Health check endpoint
│   └── metrics/           # Metrics endpoint
├── docs/
│   ├── ERD.md             # Database schema lengkap
│   ├── ARCHITECTURE.md    # Layer diagram + module table
│   └── ASYNC_FLOW.md      # Queue flow + retry + dead letter
├── docker-compose.yml
├── Dockerfile             # Multi-stage build
├── .env.example
└── README.md
```

---

## Architecture

Lihat detail di [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

```
Client
  │
Nginx (reverse proxy, SSL, rate limiting)
  │
NestJS API (Auth · Product · Order · Health · Metrics)
  │
  ├── PostgreSQL (primary database, migrations, transactions)
  └── Redis (cache + Bull queue)
            │
       Bull Workers
    (order-email · order-log · order-notif)
```

---

## Production Deployment

```bash
# Clone di server
git clone https://github.com/rhecustein/sera-test
cd sera-test

# Set environment
cp .env.example .env
# Edit .env dengan konfigurasi production

# Start semua service
docker compose up -d

# Run migrations
docker compose exec app npm run migration:run

# Seed data awal
docker compose exec app npm run seed

# Health check
curl https://sera.bintanx.com/health
```

**Demo live:** https://sera.bintanx.com  
**Swagger UI:** https://sera.bintanx.com/api/docs

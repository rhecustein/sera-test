# SERA Backend — Architecture

## Stack
- **Runtime**: Node.js 20 + NestJS + TypeScript
- **Database**: PostgreSQL 15
- **Cache & Queue**: Redis 7
- **Job Processor**: Bull (@nestjs/bull)
- **Auth**: JWT (passport-jwt)
- **Reverse Proxy**: Nginx

## Layer Architecture

```
Client (Web / Mobile / Admin Dashboard)
        │
      Nginx  ──  reverse proxy, SSL termination, rate limiting
        │
  NestJS API  ──  Auth · Product · Order · Admin modules
        │
  ┌─────┴──────┐
  │            │
PostgreSQL    Redis
(primary DB)  (cache + queue)
        │            │
    TypeORM       Bull Workers
  (migrations,   (order-email,
   transactions)  order-log,
                  order-notif)
```

## Module Structure

| Module | Responsibility |
|---|---|
| `auth` | Register, Login, JWT strategy, RBAC guards |
| `users` | User entity & service |
| `products` | CRUD product, pagination, search, sort |
| `orders` | Create order (DB transaction), history, detail |
| `queue` | Bull producers & processors (email, log, notif) |
| `activity-logs` | Persist activity log entries |
| `health` | DB + Redis health check endpoint |
| `metrics` | Request count, error rate, latency, queue stats |
| `common` | Filters, interceptors, middleware, decorators |
| `config` | DB, JWT, Redis, Mail configuration factories |

## Request Lifecycle

```
Request → RequestIdMiddleware (inject X-Request-ID)
        → ThrottlerGuard (60 req/min per IP)
        → JwtAuthGuard (validate Bearer token)
        → RolesGuard (check @Roles decorator)
        → Controller → Service → Repository
        → LoggingInterceptor (record metrics + log)
        → TransformInterceptor (wrap response)
        → Response
```

## Scaling Strategy

| Component | Strategy |
|---|---|
| NestJS API | Horizontal via PM2 cluster (dev) / Kubernetes HPA (prod) |
| PostgreSQL | Primary write + read replica for heavy queries |
| Redis | Cache product listing, session, rate limit counter |
| Bull Workers | Scale worker processes independently from API |
| Nginx | Upstream to multiple API instances with health check |

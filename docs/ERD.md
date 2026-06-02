# SERA — Entity Relationship Diagram

> ERD visual tersedia di file `ERD.png` (generated via dbdiagram.io / DBeaver).

## Schema Text Representation

```
┌─────────────────────────────────────────────────────────────────┐
│  users                                                          │
│  ─────────────────────────────────────────────────────────────  │
│  id            UUID      PK  DEFAULT gen_random_uuid()          │
│  name          VARCHAR   NOT NULL                               │
│  email         VARCHAR   NOT NULL  UNIQUE                       │
│  password      VARCHAR   NOT NULL  (bcrypt hash)                │
│  role          ENUM      NOT NULL  ('admin','customer')         │
│  created_at    TIMESTAMP NOT NULL  DEFAULT NOW()                │
│  updated_at    TIMESTAMP NOT NULL  DEFAULT NOW()                │
│  deleted_at    TIMESTAMP NULL      (soft delete)                │
└─────────────────────────────────────────────────────────────────┘
              │
              │ 1:N (user_id FK)
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  orders                                                         │
│  ─────────────────────────────────────────────────────────────  │
│  id               UUID     PK   DEFAULT gen_random_uuid()       │
│  user_id          UUID     FK → users.id                        │
│  total_price      DECIMAL(15,2) NOT NULL                        │
│  status           ENUM     NOT NULL  ('pending','paid',         │
│                                       'cancelled')              │
│  idempotency_key  VARCHAR  NOT NULL  UNIQUE                     │
│  created_at       TIMESTAMP NOT NULL DEFAULT NOW()              │
│  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()              │
│  deleted_at       TIMESTAMP NULL     (soft delete)              │
└─────────────────────────────────────────────────────────────────┘
              │
              │ 1:N (order_id FK)
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  order_items                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  id          UUID      PK  DEFAULT gen_random_uuid()            │
│  order_id    UUID      FK → orders.id                           │
│  product_id  UUID      FK → products.id                         │
│  quantity    INT       NOT NULL                                 │
│  price       DECIMAL   NOT NULL  (snapshot harga saat order)    │
│  created_at  TIMESTAMP NOT NULL  DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ N:1 (product_id FK)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  products                                                       │
│  ─────────────────────────────────────────────────────────────  │
│  id           UUID      PK  DEFAULT gen_random_uuid()           │
│  name         VARCHAR   NOT NULL                                │
│  description  TEXT      NULL                                    │
│  price        DECIMAL(15,2) NOT NULL                            │
│  stock        INT       NOT NULL  DEFAULT 0                     │
│  created_at   TIMESTAMP NOT NULL  DEFAULT NOW()                 │
│  updated_at   TIMESTAMP NOT NULL  DEFAULT NOW()                 │
│  deleted_at   TIMESTAMP NULL      (soft delete)                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  activity_logs                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  id          UUID      PK  DEFAULT gen_random_uuid()            │
│  user_id     UUID      FK → users.id  (ON DELETE SET NULL)      │
│  action      VARCHAR   NOT NULL                                 │
│  entity      VARCHAR   NULL                                     │
│  entity_id   VARCHAR   NULL                                     │
│  payload     JSONB     NULL                                     │
│  ip_address  VARCHAR   NULL                                     │
│  created_at  TIMESTAMP NOT NULL  DEFAULT NOW()                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  failed_jobs                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  id            UUID      PK  DEFAULT gen_random_uuid()          │
│  job_id        VARCHAR   NOT NULL                               │
│  job_name      VARCHAR   NOT NULL                               │
│  queue_name    VARCHAR   NOT NULL                               │
│  payload       JSONB     NULL                                   │
│  error_message TEXT      NULL                                   │
│  stack_trace   TEXT      NULL                                   │
│  attempt_count INT       NOT NULL  DEFAULT 0                    │
│  failed_at     TIMESTAMP NOT NULL  DEFAULT NOW()                │
└─────────────────────────────────────────────────────────────────┘
```

## Indexes

| Tabel.Kolom | Tipe | Alasan |
|---|---|---|
| users.email | UNIQUE | Login lookup O(1) |
| products.name | GIN/trigram | Full-text search ILIKE |
| orders.user_id + created_at | COMPOSITE | History per user |
| orders.status + created_at | COMPOSITE | Filter by status |
| orders.idempotency_key | UNIQUE | Duplicate detection |
| order_items.order_id | INDEX | Eager load items |
| activity_logs.user_id | INDEX | Log per user |
| failed_jobs.queue_name | INDEX | Filter by queue |
| failed_jobs.failed_at | INDEX DESC | Recent failures first |

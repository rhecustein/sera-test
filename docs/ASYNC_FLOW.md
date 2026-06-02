# SERA — Async Queue Flow

## Overview

Setelah `POST /orders` berhasil (201 Created), `OrderService` mendispatch
3 job secara concurrent ke Redis Bull Queue menggunakan `Promise.allSettled`.

## Flow Diagram

```
POST /orders (201 Created)
        │
        ├─── order-email queue ──► EmailProcessor
        │         └── send-invoice job
        │                  └── kirim HTML invoice via SMTP Hostinger
        │
        ├─── order-log queue ────► ActivityLogProcessor
        │         └── save-log job
        │                  └── INSERT ke tabel activity_logs
        │
        └─── order-notif queue ──► NotificationProcessor
                  └── send-notification job
                           └── kirim notifikasi WhatsApp (placeholder)
```

## Queue Configuration

```typescript
const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }, // 2s → 4s → 8s
  removeOnComplete: true,   // hapus job sukses dari Redis
  removeOnFail: false,      // simpan job gagal untuk audit
};
```

## Retry Mechanism

Bull otomatis retry job yang gagal dengan exponential backoff:

| Attempt | Delay sebelum retry |
|---|---|
| 1 | langsung |
| 2 | 2 detik |
| 3 | 4 detik |
| Setelah 3x gagal | masuk `failed` state → persist ke `failed_jobs` |

## Dead Letter Handling

Job yang gagal setelah 3 attempt:
1. Disimpan di Redis dengan status `failed` (`removeOnFail: false`)
2. Di-persist ke tabel `failed_jobs` di PostgreSQL via `@OnQueueFailed()` hook

Data yang disimpan: `job_id`, `job_name`, `queue_name`, `payload` (JSONB),
`error_message`, `stack_trace`, `attempt_count`, `failed_at`.

## Idempotency Handling

Setiap processor mengecek Redis sebelum memproses:

```typescript
const key = `job:email:${orderId}`;
const alreadyProcessed = await this.redis.setnx(key, '1');
if (!alreadyProcessed) return; // skip — sudah diproses
await this.redis.expire(key, 86400); // TTL 24 jam
```

Jika job yang sama dikirim 2x (misal karena retry), processor kedua
langsung return tanpa side effect.

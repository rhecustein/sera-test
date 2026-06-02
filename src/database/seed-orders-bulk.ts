/**
 * Bulk seeder: 7.290.000 orders (10.000/hari × 365 hari × 2 tahun)
 * Menggunakan PostgreSQL generate_series — semua diproses di DB server.
 * Estimasi waktu: ~15-30 menit tergantung hardware.
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5433,
  username: process.env.DB_USER || 'sera_user',
  password: process.env.DB_PASS || 'sera_password',
  database: process.env.DB_NAME || 'sera_db',
  synchronize: false,
  logging: false,
  connectTimeoutMS: 30000,
  extra: { statement_timeout: 0, lock_timeout: 0 },
});

const TARGET_TOTAL   = 7_300_000;
const ORDER_CHUNK    = 100_000;
const DAYS_SPAN      = 730; // 2 tahun

function fmtNum(n: number) { return n.toLocaleString('id-ID'); }
function elapsed(start: number) {
  const s = Math.round((Date.now() - start) / 1000);
  return `${Math.floor(s/60)}m${s%60}s`;
}

async function main() {
  await ds.initialize();
  console.log('✅ Connected\n');

  // ── preflight ──────────────────────────────────────────────
  const existing = await ds.query(`SELECT COUNT(*)::int AS n FROM orders`);
  const already  = existing[0].n;
  const need     = Math.max(0, TARGET_TOTAL - already);

  console.log(`📊 Target      : ${fmtNum(TARGET_TOTAL)} orders (10.000/hari × 2 tahun)`);
  console.log(`📦 Sudah ada   : ${fmtNum(already)} orders`);
  console.log(`🚀 Perlu tambah: ${fmtNum(need)} orders\n`);

  if (need <= 0) {
    console.log('✅ Data sudah cukup. Tidak perlu tambah.');
    await ds.destroy(); return;
  }

  // ── get reference data ─────────────────────────────────────
  const users    = await ds.query(`SELECT id FROM users WHERE role='customer'`);
  const products = await ds.query(`SELECT id, price FROM products WHERE deleted_at IS NULL`);

  if (!users.length || !products.length) {
    console.error('❌ Tidak ada user/product. Jalankan: npm run seed'); process.exit(1);
  }

  // Build PostgreSQL arrays for random picking
  const userArr    = `ARRAY[${users.map((u:any) => `'${u.id}'::uuid`).join(',')}]`;
  const prodArr    = `ARRAY[${products.map((p:any) => `'${p.id}'::uuid`).join(',')}]`;
  const priceArr   = `ARRAY[${products.map((p:any) => Number(p.price)).join(',')}]`;
  const numUsers   = users.length;
  const numProds   = products.length;

  console.log(`👤 Users: ${numUsers} | 📦 Products: ${numProds}`);
  console.log(`⚙  Batch size: ${fmtNum(ORDER_CHUNK)} rows/batch\n`);

  // ── disable indexes for speed ──────────────────────────────
  console.log('⏳ Menonaktifkan index sementara...');
  try {
    await ds.query(`UPDATE pg_index SET indisready=false WHERE indrelid IN ('orders'::regclass,'order_items'::regclass) AND NOT indisprimary`);
  } catch { /* non-critical */ }

  // ── insert orders in chunks ────────────────────────────────
  const chunks   = Math.ceil(need / ORDER_CHUNK);
  let   inserted = 0;
  const tStart   = Date.now();

  console.log(`📝 Inserting ${fmtNum(need)} orders in ${chunks} batches...\n`);

  for (let c = 0; c < chunks; c++) {
    const bSize = Math.min(ORDER_CHUNK, need - inserted);
    const t0    = Date.now();

    await ds.query(`
      INSERT INTO orders (id, user_id, total_price, status, idempotency_key, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        (${userArr})[ floor(random() * ${numUsers} + 1)::int ],
        round(( random() * 4900000000 + 100000 )::numeric, 2),
        (ARRAY['pending','paid','cancelled']::orders_status_enum[])[ floor(random() * 3 + 1)::int ],
        'bulk-' || to_hex(${c} * ${ORDER_CHUNK} + gs)::text,
        NOW() - make_interval(
          days  => floor(random() * ${DAYS_SPAN})::int,
          hours => floor(random() * 24)::int,
          mins  => floor(random() * 60)::int
        ),
        NOW()
      FROM generate_series(1, ${bSize}) AS gs
    `);

    inserted += bSize;

    const pct    = ((inserted / need) * 100).toFixed(1);
    const ms     = Date.now() - t0;
    const rowsps = Math.round(bSize / (ms / 1000));
    const remain = Math.round((need - inserted) / rowsps);
    const eta    = `~${Math.floor(remain/60)}m${remain%60}s`;

    process.stdout.write(
      `\r  Batch ${c+1}/${chunks} | ${fmtNum(inserted)}/${fmtNum(need)} (${pct}%) | ${fmtNum(rowsps)} rows/s | ETA ${eta}  `
    );
  }

  console.log(`\n\n✅ Orders inserted in ${elapsed(tStart)}`);

  // ── insert order_items for new orders ──────────────────────
  console.log('\n📝 Inserting order_items for new orders...');
  const tItems = Date.now();

  const itemChunkSql = `
    INSERT INTO order_items (id, order_id, product_id, quantity, price, created_at)
    SELECT
      gen_random_uuid(),
      o.id,
      (${prodArr})[ floor(random() * ${numProds} + 1)::int ],
      floor(random() * 3 + 1)::int,
      (${priceArr})[ floor(random() * ${numProds} + 1)::int ],
      o.created_at
    FROM orders o
    WHERE o.idempotency_key LIKE 'bulk-%'
      AND NOT EXISTS (
        SELECT 1 FROM order_items oi WHERE oi.order_id = o.id LIMIT 1
      )
    LIMIT $1
  `;

  let itemsInserted = 0;
  const ITEM_CHUNK  = 200_000;

  while (true) {
    const [{ n }] = await ds.query(
      `WITH inserted AS (${itemChunkSql} RETURNING order_id)
       SELECT COUNT(*)::int AS n FROM inserted`,
      [ITEM_CHUNK],
    );
    if (n === 0) break;
    itemsInserted += n;
    process.stdout.write(`\r  Items: ${fmtNum(itemsInserted)} inserted...  `);
  }

  console.log(`\n✅ Order items inserted in ${elapsed(tItems)}`);

  // ── rebuild indexes ────────────────────────────────────────
  console.log('\n⏳ Rebuilding indexes (REINDEX)...');
  try {
    await ds.query(`UPDATE pg_index SET indisready=true WHERE indrelid IN ('orders'::regclass,'order_items'::regclass) AND NOT indisprimary`);
    await ds.query(`REINDEX TABLE orders`);
    await ds.query(`REINDEX TABLE order_items`);
    console.log('✅ Indexes rebuilt');
  } catch (e) {
    console.warn('⚠ Could not rebuild indexes (non-critical):', e.message);
  }

  // ── final summary ──────────────────────────────────────────
  const summary = await ds.query(`
    SELECT
      (SELECT COUNT(*)::bigint FROM orders)      AS total_orders,
      (SELECT COUNT(*)::bigint FROM order_items) AS total_items,
      (SELECT COUNT(*)::bigint FROM orders WHERE status='pending')   AS pending,
      (SELECT COUNT(*)::bigint FROM orders WHERE status='paid')      AS paid,
      (SELECT COUNT(*)::bigint FROM orders WHERE status='cancelled') AS cancelled,
      (SELECT MIN(created_at) FROM orders)       AS oldest,
      (SELECT MAX(created_at) FROM orders)       AS newest
  `);

  const s = summary[0];
  console.log('\n══════════════════════════════════════════');
  console.log('  📊 FINAL SUMMARY');
  console.log('══════════════════════════════════════════');
  console.log(`  Total Orders  : ${fmtNum(Number(s.total_orders))}`);
  console.log(`  Total Items   : ${fmtNum(Number(s.total_items))}`);
  console.log(`  Pending       : ${fmtNum(Number(s.pending))}`);
  console.log(`  Paid          : ${fmtNum(Number(s.paid))}`);
  console.log(`  Cancelled     : ${fmtNum(Number(s.cancelled))}`);
  console.log(`  Range tanggal : ${new Date(s.oldest).toLocaleDateString('id-ID')} — ${new Date(s.newest).toLocaleDateString('id-ID')}`);
  console.log(`  Total waktu   : ${elapsed(tStart)}`);
  console.log('══════════════════════════════════════════\n');

  await ds.destroy();
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });

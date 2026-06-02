import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5433,
  username: process.env.DB_USER || 'sera_user',
  password: process.env.DB_PASS || 'sera_password',
  database: process.env.DB_NAME || 'sera_db',
  synchronize: false,
  logging: false,
});

const STATUSES = ['pending', 'paid', 'cancelled'];
const BATCH = 500;
const TOTAL = 10000;

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysAgo));
  d.setHours(rand(0, 23), rand(0, 59), rand(0, 59));
  return d.toISOString();
}

async function seedOrders() {
  await AppDataSource.initialize();
  console.log('✅ Connected to database');

  // Get all customer user IDs
  const users = await AppDataSource.query(
    `SELECT id FROM users WHERE role = 'customer'`
  );
  if (!users.length) {
    console.error('❌ No customer users found. Run npm run seed first.');
    process.exit(1);
  }

  // Get all products
  const products = await AppDataSource.query(
    `SELECT id, price FROM products WHERE deleted_at IS NULL`
  );
  if (!products.length) {
    console.error('❌ No products found. Run npm run seed first.');
    process.exit(1);
  }

  console.log(`👤 Users: ${users.length} | 📦 Products: ${products.length}`);
  console.log(`🚀 Generating ${TOTAL} orders in batches of ${BATCH}...`);

  let created = 0;

  for (let batch = 0; batch < Math.ceil(TOTAL / BATCH); batch++) {
    const batchSize = Math.min(BATCH, TOTAL - created);
    const orderValues: string[] = [];
    const itemValues: string[] = [];

    for (let i = 0; i < batchSize; i++) {
      const orderId    = `gen_random_uuid()`;
      const userId     = users[rand(0, users.length - 1)].id;
      const status     = STATUSES[rand(0, 2)];
      const createdAt  = randDate(365);
      const idemKey    = `'order-seed-${batch}-${i}-${Date.now()}-${rand(1, 999999)}'`;

      // pick 1-3 random products
      const itemCount = rand(1, 3);
      const picked: any[] = [];
      for (let k = 0; k < itemCount; k++) {
        const p = products[rand(0, products.length - 1)];
        if (!picked.find(x => x.id === p.id)) picked.push(p);
      }

      const totalPrice = picked.reduce((sum, p) => {
        const qty = rand(1, 3);
        return sum + Number(p.price) * qty;
      }, 0);

      // Insert order placeholder (we use a temp marker for items linkage)
      const orderIdVar = `order_${batch}_${i}`;

      // We'll use a CTE approach - insert orders then items
      orderValues.push(
        `(gen_random_uuid(), '${userId}', ${totalPrice}, '${status}', ${idemKey}, '${createdAt}', '${createdAt}')`
      );
    }

    // Insert orders batch
    const insertOrders = `
      INSERT INTO orders (id, user_id, total_price, status, idempotency_key, created_at, updated_at)
      VALUES ${orderValues.join(',')}
      RETURNING id, total_price
    `;

    const insertedOrders = await AppDataSource.query(insertOrders);

    // Insert order_items for each order
    const itemInserts: string[] = [];
    for (const order of insertedOrders) {
      const itemCount = rand(1, 3);
      const usedProductIds = new Set<string>();
      for (let k = 0; k < itemCount; k++) {
        let p = products[rand(0, products.length - 1)];
        // avoid duplicate product in same order
        let tries = 0;
        while (usedProductIds.has(p.id) && tries < 10) {
          p = products[rand(0, products.length - 1)];
          tries++;
        }
        usedProductIds.add(p.id);
        const qty   = rand(1, 3);
        const price = Number(p.price);
        const createdAt = randDate(365);
        itemInserts.push(
          `(gen_random_uuid(), '${order.id}', '${p.id}', ${qty}, ${price}, '${createdAt}')`
        );
      }
    }

    if (itemInserts.length) {
      await AppDataSource.query(`
        INSERT INTO order_items (id, order_id, product_id, quantity, price, created_at)
        VALUES ${itemInserts.join(',')}
      `);
    }

    created += batchSize;
    const pct = Math.round((created / TOTAL) * 100);
    process.stdout.write(`\r⏳ Progress: ${created}/${TOTAL} (${pct}%)`);
  }

  console.log('\n');

  // Summary
  const counts = await AppDataSource.query(`
    SELECT
      (SELECT COUNT(*) FROM orders)      AS total_orders,
      (SELECT COUNT(*) FROM order_items) AS total_items,
      (SELECT COUNT(*) FROM orders WHERE status = 'pending')   AS pending,
      (SELECT COUNT(*) FROM orders WHERE status = 'paid')      AS paid,
      (SELECT COUNT(*) FROM orders WHERE status = 'cancelled') AS cancelled
  `);

  const c = counts[0];
  console.log('✅ Seeder complete!');
  console.log(`   Total Orders : ${c.total_orders}`);
  console.log(`   Total Items  : ${c.total_items}`);
  console.log(`   Pending      : ${c.pending}`);
  console.log(`   Paid         : ${c.paid}`);
  console.log(`   Cancelled    : ${c.cancelled}`);

  await AppDataSource.destroy();
}

seedOrders().catch((err) => {
  console.error('\n❌ Seeder failed:', err.message);
  process.exit(1);
});

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'sera_user',
  password: process.env.DB_PASS || 'sera_password',
  database: process.env.DB_NAME || 'sera_db',
  synchronize: false,
  logging: false,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected. Running seeder...');

  const hashedAdmin = await bcrypt.hash('Admin123!', 12);
  const hashedCustomer = await bcrypt.hash('Customer123!', 12);

  await AppDataSource.query(`
    INSERT INTO users (id, name, email, password, role, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'Admin SERA', 'admin@sera.test', $1, 'admin', NOW(), NOW()),
      (gen_random_uuid(), 'Customer SERA', 'customer@sera.test', $2, 'customer', NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;
  `, [hashedAdmin, hashedCustomer]);

  await AppDataSource.query(`
    INSERT INTO products (id, name, description, price, stock, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'Toyota Avanza', 'MPV 7 seater, bensin', 250000000, 10, NOW(), NOW()),
      (gen_random_uuid(), 'Toyota Innova', 'MPV premium 8 seater', 350000000, 8, NOW(), NOW()),
      (gen_random_uuid(), 'Daihatsu Xenia', 'MPV kompak 7 seater', 220000000, 15, NOW(), NOW()),
      (gen_random_uuid(), 'Honda HR-V', 'SUV compact, bensin', 340000000, 6, NOW(), NOW()),
      (gen_random_uuid(), 'Mitsubishi Pajero', 'SUV 7 seater 4WD', 580000000, 4, NOW(), NOW()),
      (gen_random_uuid(), 'Toyota Rush', 'SUV 7 seater kompak', 290000000, 12, NOW(), NOW()),
      (gen_random_uuid(), 'Suzuki Ertiga', 'MPV 7 seater irit', 195000000, 20, NOW(), NOW()),
      (gen_random_uuid(), 'Honda CR-V', 'SUV premium 5 seater', 480000000, 5, NOW(), NOW()),
      (gen_random_uuid(), 'Hyundai Ioniq 5', 'SUV listrik premium', 720000000, 3, NOW(), NOW()),
      (gen_random_uuid(), 'Wuling Air ev', 'City car listrik', 238000000, 18, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  `);

  const counts = await AppDataSource.query(`
    SELECT
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM products) as products
  `);

  console.log(`Seeder complete!`);
  console.log(`  Users   : ${counts[0].users}`);
  console.log(`  Products: ${counts[0].products}`);
  console.log(`\nDefault credentials:`);
  console.log(`  Admin    : admin@sera.test    / Admin123!`);
  console.log(`  Customer : customer@sera.test / Customer123!`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seeder failed:', err);
  process.exit(1);
});

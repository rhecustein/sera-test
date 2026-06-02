import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrdersPerformanceIndexes1748000004000 implements MigrationInterface {
  name = 'AddOrdersPerformanceIndexes1748000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Key index: admin list without filter — ORDER BY created_at DESC WHERE deleted_at IS NULL
    // Partial index covers exactly this query; PostgreSQL uses Index Scan and stops at LIMIT rows
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_created_at_active"
      ON "orders" ("created_at" DESC)
      WHERE "deleted_at" IS NULL
    `);

    // Composite index for status-filtered list: WHERE status = ? ORDER BY created_at DESC
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_status_created_at"
      ON "orders" ("status", "created_at" DESC)
      WHERE "deleted_at" IS NULL
    `);

    // Composite index for user order history: WHERE user_id = ? ORDER BY created_at DESC
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_user_id_created_at"
      ON "orders" ("user_id", "created_at" DESC)
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_created_at_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_status_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_user_id_created_at"`);
  }
}

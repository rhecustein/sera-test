import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTable1748000002000 implements MigrationInterface {
  name = 'CreateOrdersTable1748000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "orders_status_enum" AS ENUM ('pending', 'paid', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"          UUID NOT NULL,
        "total_price"      DECIMAL(15,2) NOT NULL,
        "status"           "orders_status_enum" NOT NULL DEFAULT 'pending',
        "idempotency_key"  VARCHAR(255) NULL,
        "created_at"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "deleted_at"       TIMESTAMP NULL,
        CONSTRAINT "UQ_orders_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_orders_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_orders_user_id"    ON "orders" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_status"     ON "orders" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_deleted_at" ON "orders" ("deleted_at")`);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id"   UUID NOT NULL,
        "product_id" UUID NOT NULL,
        "quantity"   INTEGER NOT NULL,
        "price"      DECIMAL(15,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_order_items_order_id"   FOREIGN KEY ("order_id")   REFERENCES "orders"("id")   ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_order_items_order_id"   ON "order_items" ("order_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_order_items_product_id" ON "order_items" ("product_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_status_enum"`);
  }
}

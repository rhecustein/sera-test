import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1748000001000 implements MigrationInterface {
  name = 'CreateProductsTable1748000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"        VARCHAR(255) NOT NULL,
        "description" TEXT NULL,
        "price"       DECIMAL(15,2) NOT NULL,
        "stock"       INTEGER NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMP NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_products_name"       ON "products" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_deleted_at" ON "products" ("deleted_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_price"      ON "products" ("price")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
  }
}

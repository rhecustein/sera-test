import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1748000000000 implements MigrationInterface {
  name = 'CreateUsersTable1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('admin', 'customer')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"       VARCHAR(255) NOT NULL,
        "email"      VARCHAR(255) NOT NULL UNIQUE,
        "password"   VARCHAR(255) NOT NULL,
        "role"       "users_role_enum" NOT NULL DEFAULT 'customer',
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMP NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_users_email"      ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role"       ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_deleted_at" ON "users" ("deleted_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}

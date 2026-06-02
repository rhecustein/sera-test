import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateActivityLogsTable1748000003000 implements MigrationInterface {
  name = 'CreateActivityLogsTable1748000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"    UUID NULL,
        "action"     VARCHAR(255) NOT NULL,
        "entity"     VARCHAR(100) NULL,
        "entity_id"  VARCHAR(255) NULL,
        "payload"    JSONB NULL,
        "ip_address" VARCHAR(64) NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_activity_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_user_id"    ON "activity_logs" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_action"     ON "activity_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_entity_id"  ON "activity_logs" ("entity_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_created_at" ON "activity_logs" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
  }
}

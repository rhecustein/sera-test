import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFailedJobsTable1748000005000 implements MigrationInterface {
  name = 'CreateFailedJobsTable1748000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "failed_jobs" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "job_id"        VARCHAR(255) NOT NULL,
        "job_name"      VARCHAR(255) NOT NULL,
        "queue_name"    VARCHAR(100) NOT NULL,
        "payload"       JSONB NULL,
        "error_message" TEXT NULL,
        "stack_trace"   TEXT NULL,
        "attempt_count" INT NOT NULL DEFAULT 0,
        "failed_at"     TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_failed_jobs_queue_name" ON "failed_jobs" ("queue_name")`);
    await queryRunner.query(`CREATE INDEX "IDX_failed_jobs_failed_at"  ON "failed_jobs" ("failed_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "failed_jobs"`);
  }
}

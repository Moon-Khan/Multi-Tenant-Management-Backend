import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * `tenants` is the ONE table that is deliberately NOT covered by Row-Level
 * Security — a tenant can't be scoped by its own id before it exists.
 * It is created and read by the platform (table-owner) role only.
 */
export class CreateTenantsTable1785069472447 implements MigrationInterface {
  name = 'CreateTenantsTable1785069472447'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "slug" varchar(120) NOT NULL UNIQUE,
        "plan" varchar(20) NOT NULL DEFAULT 'free',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenants";`)
  }
}

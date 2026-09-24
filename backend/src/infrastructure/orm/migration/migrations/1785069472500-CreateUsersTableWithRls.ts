import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * `users` follows the same RLS recipe as `tenant_notes` (see
 * 1785069472465-CreateTenantNotesWithRls.ts): tenant_id column, RLS enabled,
 * policy scoped to current_setting('app.current_tenant_id').
 *
 * UNIQUE is on (tenant_id, email), not email alone — login is scoped by
 * tenant slug, so two different tenants may each have their own
 * "admin@company.com" without colliding.
 */
export class CreateUsersTableWithRls1785069472500 implements MigrationInterface {
  name = 'CreateUsersTableWithRls1785069472500'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'member',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_tenant_id_email" UNIQUE ("tenant_id", "email")
      );
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_users_tenant_id" ON "users" ("tenant_id");
    `)

    await queryRunner.query(`
      ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
    `)

    await queryRunner.query(`
      CREATE POLICY "tenant_isolation" ON "users"
      USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid)
      WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users";`)
  }
}

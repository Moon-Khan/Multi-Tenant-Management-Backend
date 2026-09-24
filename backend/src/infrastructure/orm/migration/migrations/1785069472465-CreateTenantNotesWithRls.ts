import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * `tenant_notes` is a deliberately tiny stand-in resource whose only job is
 * to prove the RLS mechanism end-to-end before real resources are built on
 * top of it (Week 2+). Every tenant-scoped table from here on follows this
 * exact three-step recipe:
 *   1. tenant_id uuid NOT NULL column, FK'd to tenants(id)
 *   2. ALTER TABLE ... ENABLE ROW LEVEL SECURITY
 *   3. CREATE POLICY ... USING/WITH CHECK against current_setting('app.current_tenant_id')
 *
 * The session variable is set per-request (inside a transaction, via
 * SET LOCAL / set_config) by TenantContextMiddleware — see
 * src/infrastructure/context/tenant-context.middleware.ts. The Postgres
 * table OWNER (the migration role) always bypasses RLS; the app connects as
 * a separate, non-owner "app_runtime" role (provisioned in
 * infra/postgres/init.sql) precisely so these policies actually apply to it.
 */
export class CreateTenantNotesWithRls1785069472465 implements MigrationInterface {
  name = 'CreateTenantNotesWithRls1785069472465'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenant_notes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "content" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_tenant_notes_tenant_id" ON "tenant_notes" ("tenant_id");
    `)

    await queryRunner.query(`
      ALTER TABLE "tenant_notes" ENABLE ROW LEVEL SECURITY;
    `)

    await queryRunner.query(`
      CREATE POLICY "tenant_isolation" ON "tenant_notes"
      USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid)
      WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenant_notes";`)
  }
}

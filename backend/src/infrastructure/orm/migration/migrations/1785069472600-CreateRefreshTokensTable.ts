import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateRefreshTokensTable1785069472600
  implements MigrationInterface
{
  name = 'CreateRefreshTokensTable1785069472600'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "replaced_by_token_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_tokens";`)
  }
}

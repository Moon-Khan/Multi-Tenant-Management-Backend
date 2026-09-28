import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, EntityManager } from 'typeorm'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'

/**
 * Runs one short database unit of work scoped to the current tenant:
 *
 *   acquire connection → BEGIN → set_config('app.current_tenant_id')
 *     → work(manager) → COMMIT (or ROLLBACK on throw) → release
 *
 * `set_config(..., true)` is transaction-local, so the RLS policies on
 * tenant-scoped tables see the tenant id for exactly this unit of work and
 * it can never leak onto the pooled connection's next user.
 *
 * Rules for callers:
 * - Keep `work` to database calls only. No bcrypt, JWT signing, HTTP calls
 *   or other side effects — the connection is held for as long as `work`
 *   runs, and a side effect can't be rolled back if the COMMIT fails (use
 *   an outbox table for that once there are events/emails to send).
 * - Don't nest `run` calls; each call takes its own connection. If several
 *   statements must be atomic, do them all inside one `run` and pass the
 *   manager down.
 */
@Injectable()
export class TenantTransaction {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantContextStorage: TenantContextStorage,
  ) {}

  async run<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const { tenantId } = this.tenantContextStorage.requireStore()
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()

    try {
      await queryRunner.startTransaction()
      await queryRunner.query('SELECT set_config($1, $2, true)', [
        'app.current_tenant_id',
        tenantId,
      ])
      const result = await work(queryRunner.manager)
      await queryRunner.commitTransaction()
      return result
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction()
      }
      throw err
    } finally {
      await queryRunner.release()
    }
  }
}

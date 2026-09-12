import { Injectable } from '@nestjs/common'
import { AsyncLocalStorage } from 'node:async_hooks'
import { QueryRunner } from 'typeorm'

export interface ITenantContextStore {
  tenantId: string
  queryRunner: QueryRunner
}

/**
 * Thin wrapper around Node's AsyncLocalStorage. Holds, per-request, the
 * resolved tenant id and the QueryRunner whose transaction carries the
 * `app.current_tenant_id` session variable that Postgres RLS policies read.
 * Tenant-scoped repositories pull their EntityManager from here instead of
 * from Nest's default @InjectRepository() pool connection.
 */
@Injectable()
export class TenantContextStorage {
  private readonly als = new AsyncLocalStorage<ITenantContextStore>()

  run<T>(store: ITenantContextStore, callback: () => T): T {
    return this.als.run(store, callback)
  }

  getStore(): ITenantContextStore | undefined {
    return this.als.getStore()
  }

  requireStore(): ITenantContextStore {
    const store = this.als.getStore()
    if (!store) {
      throw new Error(
        'No tenant context is active. Did you forget to run this code path through TenantContextMiddleware?',
      )
    }
    return store
  }
}

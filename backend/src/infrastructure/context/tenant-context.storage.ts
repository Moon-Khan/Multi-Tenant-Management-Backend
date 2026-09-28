import { Injectable } from '@nestjs/common'
import { AsyncLocalStorage } from 'node:async_hooks'

export interface ITenantContextStore {
  tenantId: string
}

/**
 * Thin wrapper around Node's AsyncLocalStorage. Answers exactly one
 * question per request: "which tenant am I operating under?" It holds no
 * database state — a DB unit of work for that tenant is opened (and closed)
 * on demand by TenantTransaction, which reads the tenant id from here.
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
        'No tenant context is active. Did you forget to run this code path through TenantContextMiddleware or JwtTenantContextMiddleware?',
      )
    }
    return store
  }
}

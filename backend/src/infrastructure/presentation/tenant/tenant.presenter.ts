import { ITenant, TenantPlan } from '@domain/model/tenant.interface'

/**
 * Explicitly whitelists fields instead of `Object.assign(this, partial)` —
 * that would copy ANY property present on partial through to the response,
 * regardless of what this class declares, since JS assignment doesn't
 * respect a class's declared TS shape at runtime.
 */
export class TenantPresenter implements Partial<ITenant> {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  createdAt: Date
  updatedAt: Date

  constructor(partial: ITenant) {
    this.id = partial.id
    this.name = partial.name
    this.slug = partial.slug
    this.plan = partial.plan
    this.createdAt = partial.createdAt
    this.updatedAt = partial.updatedAt
  }
}

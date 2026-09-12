import { ITenantNote } from '@domain/model/tenant-note.interface'

/**
 * Explicitly whitelists fields instead of `Object.assign(this, partial)` —
 * that would copy tenantId through too, since JS assignment doesn't respect
 * a class's declared TS shape at runtime. This is what actually keeps
 * tenantId (an internal FK, not something the caller needs — they already
 * know which tenant they are) off the wire.
 */
export class TenantNotePresenter implements Partial<ITenantNote> {
  id: string
  content: string
  createdAt: Date

  constructor(partial: ITenantNote) {
    this.id = partial.id
    this.content = partial.content
    this.createdAt = partial.createdAt
  }
}

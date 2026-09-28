import { Injectable } from '@nestjs/common'
import {
  ICreateTenantNoteData,
  ITenantNoteRepository,
} from '@domain/repositories/tenant-note.repository.interface'
import { ITenantNote } from '@domain/model/tenant-note.interface'
import { TenantNote } from '@infrastructure/orm/entities/tenant-note.entity'
import { TenantTransaction } from '@infrastructure/context/tenant-transaction'

/**
 * Deliberately does NOT use @InjectRepository(TenantNote) — that would run
 * queries on Nest's default pooled connection with no
 * `app.current_tenant_id` set, so RLS would hide every row. Instead each
 * method is one short TenantTransaction for the current request's tenant.
 */
@Injectable()
export class TenantNoteRepository implements ITenantNoteRepository {
  constructor(private readonly tenantTransaction: TenantTransaction) {}

  create(data: ICreateTenantNoteData): Promise<ITenantNote> {
    return this.tenantTransaction.run((manager) => {
      const repo = manager.getRepository(TenantNote)
      return repo.save(repo.create(data))
    })
  }

  findAll(): Promise<ITenantNote[]> {
    return this.tenantTransaction.run((manager) =>
      manager.getRepository(TenantNote).find({ order: { createdAt: 'DESC' } }),
    )
  }
}

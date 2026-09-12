import { Injectable } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import {
  ICreateTenantNoteData,
  ITenantNoteRepository,
} from '@domain/repositories/tenant-note.repository.interface'
import { ITenantNote } from '@domain/model/tenant-note.interface'
import { TenantNote } from '@infrastructure/orm/entities/tenant-note.entity'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'

/**
 * Deliberately does NOT use @InjectRepository(TenantNote) — that would run
 * queries on Nest's default pooled connection, outside the per-request
 * transaction that carries `app.current_tenant_id`. Instead it pulls the
 * EntityManager off the request-scoped QueryRunner in TenantContextStorage,
 * so every query here runs inside the RLS-aware transaction.
 */
@Injectable()
export class TenantNoteRepository implements ITenantNoteRepository {
  constructor(private readonly tenantContextStorage: TenantContextStorage) {}

  private get manager(): EntityManager {
    return this.tenantContextStorage.requireStore().queryRunner.manager
  }

  async create(data: ICreateTenantNoteData): Promise<ITenantNote> {
    const repo = this.manager.getRepository(TenantNote)
    return repo.save(repo.create(data))
  }

  findAll(): Promise<ITenantNote[]> {
    return this.manager
      .getRepository(TenantNote)
      .find({ order: { createdAt: 'DESC' } })
  }
}

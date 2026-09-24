import { TenantNoteRepository } from '@infrastructure/orm/repositories/tenant-note.repository'
import { ITenantNote } from '@domain/model/tenant-note.interface'
import { IRequestContext } from '@domain/model/request-context.interface'

export class TenantNoteUsecase {
  constructor(private readonly tenantNoteRepository: TenantNoteRepository) {}

  create(content: string, ctx: IRequestContext): Promise<ITenantNote> {
    return this.tenantNoteRepository.create({
      tenantId: ctx.tenantId,
      content,
    })
  }

  // No tenantId argument — RLS restricts the result set. This is the whole
  // point of the pattern: even if a future engineer calls findAll() from a
  // context they shouldn't, the database — not application code — is what
  // stops cross-tenant data from leaking out.
  findAll(): Promise<ITenantNote[]> {
    return this.tenantNoteRepository.findAll()
  }
}

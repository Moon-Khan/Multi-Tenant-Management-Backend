import { ITenantNote } from '@domain/model/tenant-note.interface'

export interface ICreateTenantNoteData {
  tenantId: string
  content: string
}

export interface ITenantNoteRepository {
  create: (data: ICreateTenantNoteData) => Promise<ITenantNote>
  // Deliberately takes NO tenantId parameter — unlike the reference guide's
  // findByOrgId(id, req) pattern, the database itself restricts the result
  // set to the current tenant via the RLS policy. There is no WHERE clause
  // to forget here.
  findAll: () => Promise<ITenantNote[]>
}

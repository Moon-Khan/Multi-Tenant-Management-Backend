import { IUser, UserRole } from '@domain/model/user.interface'

export interface ICreateUserData {
  tenantId: string
  email: string
  passwordHash: string
  role?: UserRole
}

export interface IUserRepository {
  create: (data: ICreateUserData) => Promise<IUser>
  // No tenantId parameter — same reasoning as ITenantNoteRepository.findAll:
  // the RLS policy on `users` already restricts results to the current
  // tenant, so a bare email lookup can't accidentally cross tenants.
  findByEmail: (email: string) => Promise<IUser | null>
  findById: (id: string) => Promise<IUser | null>
}

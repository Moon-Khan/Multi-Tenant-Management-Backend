export type UserRole = 'admin' | 'member' | 'viewer'

export interface IUser {
  id: string
  tenantId: string
  email: string
  passwordHash: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

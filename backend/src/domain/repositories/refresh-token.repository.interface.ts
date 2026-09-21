import { IRefreshToken } from '@domain/model/refresh-token.interface'

export interface ICreateRefreshTokenData {
  id: string
  userId: string
  tenantId: string
  tokenHash: string
  expiresAt: Date
}

export interface IRefreshTokenRepository {
  create: (data: ICreateRefreshTokenData) => Promise<IRefreshToken>
  findById: (id: string) => Promise<IRefreshToken | null>
  markRotated: (id: string, replacedByTokenId: string) => Promise<void>
  revoke: (id: string) => Promise<void>
  revokeAllForUser: (userId: string) => Promise<void>
}

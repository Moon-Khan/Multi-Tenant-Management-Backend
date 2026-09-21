export interface IRefreshToken {
  id: string
  userId: string
  tenantId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  replacedByTokenId: string | null
  createdAt: Date
}

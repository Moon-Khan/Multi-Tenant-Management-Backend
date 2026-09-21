import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'
import { IRefreshToken } from '@domain/model/refresh-token.interface'

@Entity({ name: 'refresh_tokens' })
export class RefreshToken implements IRefreshToken {
  @PrimaryColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash!: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null

  @Column({ name: 'replaced_by_token_id', type: 'uuid', nullable: true })
  replacedByTokenId!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}

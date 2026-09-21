import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Tenant } from '@infrastructure/orm/entities/tenant.entity'
import { RefreshToken } from '@infrastructure/orm/entities/refresh-token.entity'
import { TenantRepository } from '@infrastructure/orm/repositories/tenant.repository'
import { TenantNoteRepository } from '@infrastructure/orm/repositories/tenant-note.repository'
import { UserRepository } from '@infrastructure/orm/repositories/user.repository'
import { RefreshTokenRepository } from '@infrastructure/orm/repositories/refresh-token.repository'
import { TenantContextStorageModule } from '@infrastructure/context/tenant-context-storage.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, RefreshToken]),
    TenantContextStorageModule,
  ],
  providers: [
    TenantRepository,
    TenantNoteRepository,
    UserRepository,
    RefreshTokenRepository,
  ],
  exports: [
    TenantRepository,
    TenantNoteRepository,
    UserRepository,
    RefreshTokenRepository,
  ],
})
export class RepositoriesModule {}

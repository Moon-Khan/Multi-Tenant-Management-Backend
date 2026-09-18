import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Tenant } from '@infrastructure/orm/entities/tenant.entity'
import { TenantRepository } from '@infrastructure/orm/repositories/tenant.repository'
import { TenantNoteRepository } from '@infrastructure/orm/repositories/tenant-note.repository'
import { UserRepository } from '@infrastructure/orm/repositories/user.repository'
import { TenantContextStorageModule } from '@infrastructure/context/tenant-context-storage.module'

@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), TenantContextStorageModule],
  providers: [TenantRepository, TenantNoteRepository, UserRepository],
  exports: [TenantRepository, TenantNoteRepository, UserRepository],
})
export class RepositoriesModule {}

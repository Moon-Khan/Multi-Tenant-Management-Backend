import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Tenant } from '@infrastructure/orm/entities/tenant.entity'
import { TenantRepository } from '@infrastructure/orm/repositories/tenant.repository'
import { TenantNoteRepository } from '@infrastructure/orm/repositories/tenant-note.repository'
import { TenantContextStorageModule } from '@infrastructure/context/tenant-context-storage.module'

@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), TenantContextStorageModule],
  providers: [TenantRepository, TenantNoteRepository],
  exports: [TenantRepository, TenantNoteRepository],
})
export class RepositoriesModule {}

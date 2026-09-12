import { Module } from '@nestjs/common'
import { RepositoriesModule } from '@infrastructure/orm/repositories/repositories.module'
import { TenantUsecaseProvider } from '@infrastructure-usecases-bridge/providers/tenant.provider'
import { TenantNoteUsecaseProvider } from '@infrastructure-usecases-bridge/providers/tenant-note.provider'
import {
  TENANT_NOTE_USECASE_PROXY,
  TENANT_USECASE_PROXY,
} from '@infrastructure-usecases-bridge/usecase-proxy'

@Module({
  imports: [RepositoriesModule],
  providers: [TenantUsecaseProvider(), TenantNoteUsecaseProvider()],
  exports: [TENANT_USECASE_PROXY, TENANT_NOTE_USECASE_PROXY],
})
export class InfrastructureUsecasesBridgeModule {}

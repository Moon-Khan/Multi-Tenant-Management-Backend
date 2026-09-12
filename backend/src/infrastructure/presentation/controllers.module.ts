import { Module } from '@nestjs/common'
import { InfrastructureUsecasesBridgeModule } from '@infrastructure-usecases-bridge/infrastructure-usecases-bridge.module'
import { TenantContextStorageModule } from '@infrastructure/context/tenant-context-storage.module'
import { TenantController } from '@infrastructure/presentation/tenant/tenant.controller'
import { TenantNoteController } from '@infrastructure/presentation/tenant-note/tenant-note.controller'

@Module({
  imports: [InfrastructureUsecasesBridgeModule, TenantContextStorageModule],
  controllers: [TenantController, TenantNoteController],
})
export class ControllersModule {}

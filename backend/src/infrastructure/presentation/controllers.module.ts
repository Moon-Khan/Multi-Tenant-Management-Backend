import { Module } from '@nestjs/common'
import { InfrastructureUsecasesBridgeModule } from '@infrastructure-usecases-bridge/infrastructure-usecases-bridge.module'
import { TenantContextStorageModule } from '@infrastructure/context/tenant-context-storage.module'
import { TenantController } from '@infrastructure/presentation/tenant/tenant.controller'
import { TenantNoteController } from '@infrastructure/presentation/tenant-note/tenant-note.controller'
import { HealthController } from '@infrastructure/presentation/health/health.controller'
import { AuthModule } from '@infrastructure/auth/auth.module'

@Module({
  imports: [InfrastructureUsecasesBridgeModule, TenantContextStorageModule, AuthModule],
  controllers: [TenantController, TenantNoteController, HealthController],
})
export class ControllersModule {}

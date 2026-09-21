import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { RepositoriesModule } from '@infrastructure/orm/repositories/repositories.module'
import { TenantUsecaseProvider } from '@infrastructure-usecases-bridge/providers/tenant.provider'
import { TenantNoteUsecaseProvider } from '@infrastructure-usecases-bridge/providers/tenant-note.provider'
import { UserUsecaseProvider } from '@infrastructure-usecases-bridge/providers/user.provider'
import { AuthUsecaseProvider } from '@infrastructure-usecases-bridge/providers/auth.provider'
import {
  AUTH_USECASE_PROXY,
  TENANT_NOTE_USECASE_PROXY,
  TENANT_USECASE_PROXY,
  USER_USECASE_PROXY,
} from '@infrastructure-usecases-bridge/usecase-proxy'

@Module({
  imports: [RepositoriesModule, JwtModule.register({})],
  providers: [
    TenantUsecaseProvider(),
    TenantNoteUsecaseProvider(),
    UserUsecaseProvider(),
    AuthUsecaseProvider(),
  ],
  exports: [
    TENANT_USECASE_PROXY,
    TENANT_NOTE_USECASE_PROXY,
    USER_USECASE_PROXY,
    AUTH_USECASE_PROXY,
  ],
})
export class InfrastructureUsecasesBridgeModule {}

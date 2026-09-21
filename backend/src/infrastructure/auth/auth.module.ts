import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { InfrastructureUsecasesBridgeModule } from '@infrastructure-usecases-bridge/infrastructure-usecases-bridge.module'
import { TenantContextStorageModule } from '@infrastructure/context/tenant-context-storage.module'
import { AuthController } from '@infrastructure/presentation/auth/auth.controller'
import { JwtStrategy } from '@infrastructure/auth/strategies/jwt.strategy'
import { LocalStrategy } from '@infrastructure/auth/strategies/local.strategy'

@Module({
  imports: [
    PassportModule,
    InfrastructureUsecasesBridgeModule,
    TenantContextStorageModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, LocalStrategy],
})
export class AuthModule {}

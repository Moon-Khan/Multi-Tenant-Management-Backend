import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { RepositoriesModule } from '@infrastructure/orm/repositories/repositories.module'
import { TenantContextStorageModule } from '@infrastructure/context/tenant-context-storage.module'
import { TenantContextMiddleware } from '@infrastructure/context/tenant-context.middleware'
import { JwtTenantContextMiddleware } from '@infrastructure/context/jwt-tenant-context.middleware'

@Module({
  imports: [RepositoriesModule, TenantContextStorageModule, JwtModule.register({})],
  providers: [TenantContextMiddleware, JwtTenantContextMiddleware],

  exports: [
    RepositoriesModule,
    TenantContextStorageModule,
    JwtModule,
    TenantContextMiddleware,
    JwtTenantContextMiddleware,
  ],
})
export class TenantContextModule {}

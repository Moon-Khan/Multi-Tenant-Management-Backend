import { Module } from '@nestjs/common'
import { RepositoriesModule } from '@infrastructure/orm/repositories/repositories.module'
import { TenantContextStorageModule } from '@infrastructure/context/tenant-context-storage.module'
import { TenantContextMiddleware } from '@infrastructure/context/tenant-context.middleware'

@Module({
  imports: [RepositoriesModule, TenantContextStorageModule],
  providers: [TenantContextMiddleware],
  // RepositoriesModule is re-exported (not just imported) because NestJS
  // resolves a middleware's constructor dependencies in the scope of the
  // module whose configure() applies it (AppModule) — not the module that
  // declares the middleware. AppModule needs transitive access to
  // TenantRepository for this DI resolution to succeed.
  exports: [RepositoriesModule, TenantContextStorageModule, TenantContextMiddleware],
})
export class TenantContextModule {}

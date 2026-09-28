import { Module } from '@nestjs/common'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'
import { TenantTransaction } from '@infrastructure/context/tenant-transaction'

/**
 * Split out from TenantContextModule to break a would-be circular import:
 * RepositoriesModule needs TenantTransaction (for the RLS-scoped
 * repositories), and TenantContextModule needs RepositoriesModule (for
 * TenantRepository, to resolve a tenant slug in the middleware). This leaf
 * module imports no other app module — TenantTransaction's DataSource comes
 * from the global TypeORM root — so both of the above can import it safely.
 */
@Module({
  providers: [TenantContextStorage, TenantTransaction],
  exports: [TenantContextStorage, TenantTransaction],
})
export class TenantContextStorageModule {}

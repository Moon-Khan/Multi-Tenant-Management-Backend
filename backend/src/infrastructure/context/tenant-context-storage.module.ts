import { Module } from '@nestjs/common'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'

/**
 * Split out from TenantContextModule to break a would-be circular import:
 * RepositoriesModule needs TenantContextStorage (for TenantNoteRepository),
 * and TenantContextModule needs RepositoriesModule (for TenantRepository, to
 * resolve a tenant slug in the middleware). This leaf module has no
 * dependencies of its own, so both of the above can import it safely.
 */
@Module({
  providers: [TenantContextStorage],
  exports: [TenantContextStorage],
})
export class TenantContextStorageModule {}

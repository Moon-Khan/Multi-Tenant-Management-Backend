import { TenantRepository } from '@infrastructure/orm/repositories/tenant.repository'
import { TenantUsecase } from '@use-cases/tenant/tenant.usecase'
import UsecaseProxy, { TENANT_USECASE_PROXY } from '@infrastructure-usecases-bridge/usecase-proxy'

export function TenantUsecaseProvider() {
  return {
    inject: [TenantRepository],
    provide: TENANT_USECASE_PROXY,
    useFactory: (tenantRepository: TenantRepository) =>
      new UsecaseProxy(new TenantUsecase(tenantRepository)),
  }
}

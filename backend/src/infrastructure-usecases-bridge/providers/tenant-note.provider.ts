import { TenantNoteRepository } from '@infrastructure/orm/repositories/tenant-note.repository'
import { TenantNoteUsecase } from '@use-cases/tenant-note/tenant-note.usecase'
import UsecaseProxy, {
  TENANT_NOTE_USECASE_PROXY,
} from '@infrastructure-usecases-bridge/usecase-proxy'

export function TenantNoteUsecaseProvider() {
  return {
    inject: [TenantNoteRepository],
    provide: TENANT_NOTE_USECASE_PROXY,
    useFactory: (tenantNoteRepository: TenantNoteRepository) =>
      new UsecaseProxy(new TenantNoteUsecase(tenantNoteRepository)),
  }
}

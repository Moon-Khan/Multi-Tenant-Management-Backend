export default class UsecaseProxy<T> {
  constructor(private readonly usecase: T) {}

  getInstance(): T {
    return this.usecase
  }
}

export const TENANT_USECASE_PROXY = 'TenantUsecaseProxy'
export const TENANT_NOTE_USECASE_PROXY = 'TenantNoteUsecaseProxy'

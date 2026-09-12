import { ITenant } from '@domain/model/tenant.interface'

export interface ICreateTenantData {
  name: string
  slug: string
}

export interface ITenantRepository {
  findById: (id: string) => Promise<ITenant | null>
  findBySlug: (slug: string) => Promise<ITenant | null>
  create: (data: ICreateTenantData) => Promise<ITenant>
  findAll: () => Promise<ITenant[]>
}

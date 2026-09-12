export type TenantPlan = 'free' | 'pro' | 'enterprise'

export interface ITenant {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  createdAt: Date
  updatedAt: Date
}

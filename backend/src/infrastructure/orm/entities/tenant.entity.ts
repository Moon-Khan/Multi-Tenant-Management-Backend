import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { ITenant } from '@domain/model/tenant.interface'
import type { TenantPlan } from '@domain/model/tenant.interface'

/**
 * NOTE ON RLS: this table is deliberately NOT covered by a tenant-scoping
 * Row-Level Security policy — a tenant cannot be scoped by its own id before
 * it's known. Tenant creation/listing runs through the platform (RLS-bypass)
 * DB role. Every OTHER entity in the system (created from Phase 3 onward)
 * carries a tenant_id column and IS covered by RLS — see
 * src/infrastructure/orm/migration/migrations/*-EnableRowLevelSecurity.ts.
 */
@Entity({ name: 'tenants' })
export class Tenant implements ITenant {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 120 })
  name: string

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string

  @Column({ type: 'varchar', length: 20, default: 'free' })
  plan: TenantPlan

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}

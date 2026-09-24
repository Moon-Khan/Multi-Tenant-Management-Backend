import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ITenantNote } from '@domain/model/tenant-note.interface'

@Entity({ name: 'tenant_notes' })
export class TenantNote implements ITenantNote {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string

  @Column({ type: 'text' })
  content: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}

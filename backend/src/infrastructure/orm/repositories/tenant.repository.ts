import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  ICreateTenantData,
  ITenantRepository,
} from '@domain/repositories/tenant.repository.interface'
import { ITenant } from '@domain/model/tenant.interface'
import { Tenant } from '@infrastructure/orm/entities/tenant.entity'

@Injectable()
export class TenantRepository implements ITenantRepository {
  constructor(
    @InjectRepository(Tenant) private readonly repo: Repository<Tenant>,
  ) {}

  findById(id: string): Promise<ITenant | null> {
    return this.repo.findOne({ where: { id } })
  }

  findBySlug(slug: string): Promise<ITenant | null> {
    return this.repo.findOne({ where: { slug } })
  }

  findAll(): Promise<ITenant[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  create(data: ICreateTenantData): Promise<ITenant> {
    return this.repo.save(this.repo.create(data))
  }
}

import { ConflictException, NotFoundException } from '@nestjs/common'
import { TenantRepository } from '@infrastructure/orm/repositories/tenant.repository'
import { ITenant } from '@domain/model/tenant.interface'

/**
 * NOTE: this file imports @nestjs/common exceptions, same tradeoff the
 * reference guide's SiteUsecase makes — Nest's HttpException hierarchy is
 * framework metadata, not an HTTP/Express dependency, so it's treated as an
 * acceptable exception to "zero NestJS imports" (see architecture guide
 * Phase 6 lint rule of thumb: forbidden imports are HTTP decorators/Request/
 * Response types, not the exception classes).
 */
export class TenantUsecase {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async create(name: string, slug: string): Promise<ITenant> {
    const existing = await this.tenantRepository.findBySlug(slug)
    if (existing) {
      throw new ConflictException(`Tenant slug "${slug}" is already taken`)
    }
    return this.tenantRepository.create({ name, slug })
  }

  async findOne(id: string): Promise<ITenant> {
    const tenant = await this.tenantRepository.findById(id)
    if (!tenant) {
      throw new NotFoundException('Tenant not found')
    }
    return tenant
  }

  findAll(): Promise<ITenant[]> {
    return this.tenantRepository.findAll()
  }
}

import { ConflictException, NotFoundException } from '@nestjs/common'
import { TenantUsecase } from '@use-cases/tenant/tenant.usecase'
import { TenantRepository } from '@infrastructure/orm/repositories/tenant.repository'
import { ITenant } from '@domain/model/tenant.interface'

describe('TenantUsecase', () => {
  let tenantRepository: jest.Mocked<TenantRepository>
  let usecase: TenantUsecase

  const tenant: ITenant = {
    id: 'tenant-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    plan: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    tenantRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<TenantRepository>
    usecase = new TenantUsecase(tenantRepository)
  })

  describe('create', () => {
    it('rejects a slug that is already taken', async () => {
      tenantRepository.findBySlug.mockResolvedValue(tenant)

      await expect(usecase.create('Acme Corp', 'acme-corp')).rejects.toThrow(
        ConflictException,
      )
      expect(tenantRepository.create).not.toHaveBeenCalled()
    })

    it('creates the tenant when the slug is free', async () => {
      tenantRepository.findBySlug.mockResolvedValue(null)
      tenantRepository.create.mockResolvedValue(tenant)

      await expect(usecase.create('Acme Corp', 'acme-corp')).resolves.toEqual(
        tenant,
      )
      expect(tenantRepository.create).toHaveBeenCalledWith({
        name: 'Acme Corp',
        slug: 'acme-corp',
      })
    })
  })

  describe('findOne', () => {
    it('throws NotFound for an unknown id', async () => {
      tenantRepository.findById.mockResolvedValue(null)

      await expect(usecase.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('returns the tenant when found', async () => {
      tenantRepository.findById.mockResolvedValue(tenant)

      await expect(usecase.findOne('tenant-1')).resolves.toEqual(tenant)
    })
  })

  describe('findAll', () => {
    it('delegates straight to the repository', async () => {
      tenantRepository.findAll.mockResolvedValue([tenant])

      await expect(usecase.findAll()).resolves.toEqual([tenant])
    })
  })
})

import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { TenantRepository } from '@infrastructure/orm/repositories/tenant.repository'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'

const TENANT_HEADER = 'x-tenant-slug'

/**
 * Establishes the tenant for pre-authentication routes (register/login),
 * where there's no JWT yet, from the `x-tenant-slug` header. Only resolves
 * *which* tenant — it holds no connection or transaction; repositories open
 * short per-operation transactions via TenantTransaction.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantContextStorage: TenantContextStorage,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.header(TENANT_HEADER)
      if (!slug) {
        throw new BadRequestException(
          `Missing required header: ${TENANT_HEADER}`,
        )
      }

      const tenant = await this.tenantRepository.findBySlug(slug)
      if (!tenant) {
        throw new NotFoundException(`Unknown tenant "${slug}"`)
      }

      this.tenantContextStorage.run({ tenantId: tenant.id }, () => {
        next()
      })
    } catch (err) {
      next(err)
    }
  }
}

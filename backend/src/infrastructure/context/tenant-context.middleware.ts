import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { NextFunction, Request, Response } from 'express'
import { DataSource } from 'typeorm'
import { TenantRepository } from '@infrastructure/orm/repositories/tenant.repository'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'

const TENANT_HEADER = 'x-tenant-slug'

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantRepository: TenantRepository,
    private readonly tenantContextStorage: TenantContextStorage,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const queryRunner = this.dataSource.createQueryRunner()
      await queryRunner.connect()
      await queryRunner.startTransaction()
      await queryRunner.query('SELECT set_config($1, $2, true)', [
        'app.current_tenant_id',
        tenant.id,
      ])

      res.on('finish', () => {
        if (queryRunner.isReleased) return
        const settle =
          res.statusCode < 400
            ? queryRunner.commitTransaction()
            : queryRunner.rollbackTransaction()
        void settle.finally(() => queryRunner.release())
      })

      this.tenantContextStorage.run(
        { tenantId: tenant.id, queryRunner },
        () => {
          next()
        },
      )
    } catch (err) {
      next(err)
    }
  }
}

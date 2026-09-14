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

/**
 * Resolves the tenant for every incoming request and opens a transaction
 * scoped to it, with Postgres's `app.current_tenant_id` session variable set`
 * via SET LOCAL so RLS policies can see it. The transaction is committed or
 * rolled back when the response finishes.
 *
 * TEMPORARY: tenant resolution here reads a plain header. From Week 2 onward
 * this is replaced by reading the tenant claim out of the verified JWT —
 * the header approach lets Phase 1 verify RLS end-to-end before auth exists.
 *
 * NOTE: this uses SET LOCAL (transaction-scoped), not SET (session-scoped),
 * specifically because the underlying pg connection is pooled and reused
 * across unrelated requests — a session-scoped SET would leak one request's
 * tenant into the next request that happens to grab the same connection.
 */
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
        throw new BadRequestException(`Missing required header: ${TENANT_HEADER}`)
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

      this.tenantContextStorage.run({ tenantId: tenant.id, queryRunner }, () => {
        next()
      })
    } catch (err) {
      next(err)
    }
  }
}

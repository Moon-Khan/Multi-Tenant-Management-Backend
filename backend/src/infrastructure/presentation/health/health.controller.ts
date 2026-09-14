import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

/**
 * Unauthenticated liveness/readiness probe — deliberately outside
 * TenantContextMiddleware and any auth guard, since callers (load balancers,
 * uptime monitors) have no tenant or credentials to present.
 */
@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get(['/', 'health'])
  @HttpCode(HttpStatus.OK)
  async check() {
    let database: 'up' | 'down' = 'up'

    try {
      await this.dataSource.query('SELECT 1')
    } catch {
      database = 'down'
    }

    if (database === 'down') {
      throw new ServiceUnavailableException({
        status: 'error',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database,
      })
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database,
    }
  }
}

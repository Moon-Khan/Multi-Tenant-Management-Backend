import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { ResponseMessage } from '@infrastructure/response/response-message.decorator'


@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @ResponseMessage('Service is healthy')
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

import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

export const REDIS_CLIENT = 'REDIS_CLIENT'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Redis({
          host: configService.get<string>('redisCache.host'),
          port: configService.get<number>('redisCache.port'),
          // Rate limiting is a request-path dependency: fail fast rather
          // than let ioredis queue commands indefinitely against a Redis
          // that's down, which would otherwise hang every request.
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // Without this, app.close() (every e2e test's teardown, and a real
  // graceful shutdown) leaves the TCP connection to Redis open.
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit()
  }
}

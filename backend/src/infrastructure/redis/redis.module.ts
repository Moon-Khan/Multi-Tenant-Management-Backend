import { Global, Module } from '@nestjs/common'
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
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

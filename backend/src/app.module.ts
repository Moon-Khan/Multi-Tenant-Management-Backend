import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import configuration from '@infrastructure/config/env-config/configuration'
import { DatabaseOrmConfigModule } from '@infrastructure/orm/database-orm-config.module'
import { TenantContextModule } from '@infrastructure/context/tenant-context.module'
import { TenantContextMiddleware } from '@infrastructure/context/tenant-context.middleware'
import { JwtTenantContextMiddleware } from '@infrastructure/context/jwt-tenant-context.middleware'
import { ControllersModule } from '@infrastructure/presentation/controllers.module'
import { TenantNoteController } from '@infrastructure/presentation/tenant-note/tenant-note.controller'
import { AllExceptionsFilter } from '@infrastructure/exceptionHandler/all-exceptions.filter'
import { ResponseInterceptor } from '@infrastructure/response/response.interceptor'

import { RolesGuard } from '@infrastructure/auth/guards/roles.guard'
import { RedisModule } from '@infrastructure/redis/redis.module'
import { RateLimitGuard } from '@infrastructure/rate-limit/rate-limit.guard'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: configuration }),
    DatabaseOrmConfigModule,
    RedisModule,
    TenantContextModule,
    ControllersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(JwtTenantContextMiddleware).forRoutes(TenantNoteController)

    consumer.apply(TenantContextMiddleware).forRoutes(
      { path: 'auth/register', method: RequestMethod.POST },
      { path: 'auth/login', method: RequestMethod.POST },
    )
  }
}

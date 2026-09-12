import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER } from '@nestjs/core'
import configuration from '@infrastructure/config/env-config/configuration'
import { DatabaseOrmConfigModule } from '@infrastructure/orm/database-orm-config.module'
import { TenantContextModule } from '@infrastructure/context/tenant-context.module'
import { TenantContextMiddleware } from '@infrastructure/context/tenant-context.middleware'
import { ControllersModule } from '@infrastructure/presentation/controllers.module'
import { TenantNoteController } from '@infrastructure/presentation/tenant-note/tenant-note.controller'
import { HttpExceptionFilter } from '@infrastructure/exceptionHandler/http-exception.filter'
import { QueryFailedFilter } from '@infrastructure/exceptionHandler/query-failed.filter'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: configuration }),
    DatabaseOrmConfigModule,
    TenantContextModule,
    ControllersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: QueryFailedFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Only tenant-SCOPED resources go through TenantContextMiddleware.
    // TenantController (tenants themselves) is platform-level and is
    // intentionally excluded — see the comment on TenantController.
    consumer.apply(TenantContextMiddleware).forRoutes(TenantNoteController)
  }
}

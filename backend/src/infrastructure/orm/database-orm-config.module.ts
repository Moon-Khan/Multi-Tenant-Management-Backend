import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Tenant } from '@infrastructure/orm/entities/tenant.entity'
import { TenantNote } from '@infrastructure/orm/entities/tenant-note.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [Tenant, TenantNote],
        // Schema changes go exclusively through migrations — see
        // src/infrastructure/orm/migration/migrations.
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseOrmConfigModule {}

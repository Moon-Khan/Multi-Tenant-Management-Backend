import 'dotenv/config'
import { DataSource } from 'typeorm'
import { Tenant } from '@infrastructure/orm/entities/tenant.entity'
import { TenantNote } from '@infrastructure/orm/entities/tenant-note.entity'
import { User } from '@infrastructure/orm/entities/user.entity'
import { RefreshToken } from '@infrastructure/orm/entities/refresh-token.entity'

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.MIGRATION_DB_USERNAME ?? 'postgres',
  password: process.env.MIGRATION_DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'multitenant',
  entities: [Tenant, TenantNote, User, RefreshToken],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
})

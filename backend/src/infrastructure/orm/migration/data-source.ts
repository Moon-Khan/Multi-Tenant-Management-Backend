import 'dotenv/config'
import { DataSource } from 'typeorm'
import { Tenant } from '@infrastructure/orm/entities/tenant.entity'
import { TenantNote } from '@infrastructure/orm/entities/tenant-note.entity'
import { User } from '@infrastructure/orm/entities/user.entity'

/**
 * Standalone TypeORM DataSource used ONLY by the `typeorm` CLI
 * (migration:generate / migration:run / migration:revert). Deliberately
 * connects with the table-OWNER role (MIGRATION_DB_*, defaults to the
 * Postgres superuser), NOT the app's runtime role — RLS policies must not
 * apply to the role that creates/alters the tables, and DDL like `CREATE
 * POLICY` requires owner privileges anyway. The running app connects with a
 * separate, lower-privileged role instead — see DatabaseOrmConfigModule and
 * infra/postgres/init.sql.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.MIGRATION_DB_USERNAME ?? 'postgres',
  password: process.env.MIGRATION_DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'multitenant',
  entities: [Tenant, TenantNote, User],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
})

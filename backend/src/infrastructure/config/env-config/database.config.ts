import { registerAs } from '@nestjs/config'

export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  // The RUNTIME role (non-owner of the tables) so that RLS policies actually
  // apply to it. Provisioned in infra/postgres/init.sql. Migrations connect
  // as a separate, table-owning role instead — see orm/migration/data-source.ts.
  username: process.env.DB_USERNAME ?? 'app_runtime',
  password: process.env.DB_PASSWORD ?? 'app_runtime_dev_password',
  name: process.env.DB_NAME ?? 'multitenant',
  synchronize: false,
}))

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
  // Connections are held only for the length of one short transaction, so
  // a modest pool goes a long way. The acquire timeout makes a saturated
  // pool fail fast (503) instead of queueing requests forever.
  poolMax: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
  poolAcquireTimeoutMs: parseInt(
    process.env.DB_POOL_ACQUIRE_TIMEOUT_MS ?? '5000',
    10,
  ),
}))

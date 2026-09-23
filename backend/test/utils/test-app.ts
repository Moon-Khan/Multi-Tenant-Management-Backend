import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import type { Redis } from 'ioredis'
import { AppModule } from '../../src/app.module'
import { REDIS_CLIENT } from '@infrastructure/redis/redis.module'

export interface ITestApp {
  app: INestApplication
  redis: Redis
}

/**
 * Boots the real AppModule end to end — same global pipes/middleware as
 * main.ts — against the dev Postgres/Redis from `docker compose up -d`
 * (migrations must already be applied). This is what makes these tests
 * worth having: they exercise the actual RLS policies, the actual JWT
 * verification, the actual RolesGuard/RateLimitGuard, not mocks of them.
 */
export async function createTestApp(): Promise<ITestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  const app = moduleRef.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  app.use(cookieParser())
  await app.init()

  const redis = app.get<Redis>(REDIS_CLIENT)
  return { app, redis }
}

// RateLimitGuard is global, so every request in every spec file shares the
// same IP-scoped buckets. Clearing them before a file's tests run keeps
// each file's own rate-limit expectations independent of whatever ran
// before it (important given --runInBand executes spec files in sequence
// against the same Redis instance).
export async function clearRateLimits(redis: Redis): Promise<void> {
  const keys = await redis.keys('ratelimit:*')
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

// Every tenant/email in these specs is namespaced with this so repeated
// `npm run test:e2e` runs against the same persistent dev database never
// collide with previous runs' rows (tenants.slug and users(tenant_id,
// email) are both unique).
export const uniqueSuffix = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

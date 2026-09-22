import { SetMetadata } from '@nestjs/common'

export const RATE_LIMIT_KEY = 'rate_limit'

export interface IRateLimitOptions {
  limit: number
  windowSeconds: number
}

export const RateLimit = (limit: number, windowSeconds: number) =>
  SetMetadata<string, IRateLimitOptions>(RATE_LIMIT_KEY, { limit, windowSeconds })

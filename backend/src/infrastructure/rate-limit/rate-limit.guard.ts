import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request, Response } from 'express'
import type { Redis } from 'ioredis'
import { REDIS_CLIENT } from '@infrastructure/redis/redis.module'
import {
  IRateLimitOptions,
  RATE_LIMIT_KEY,
} from '@infrastructure/rate-limit/rate-limit.decorator'
import type { IAuthenticatedUser } from '@infrastructure/auth/strategies/jwt.strategy'

const DEFAULT_OPTIONS: IRateLimitOptions = { limit: 300, windowSeconds: 60 }

const INCREMENT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name)

  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const override = this.reflector.getAllAndOverride<
      IRateLimitOptions | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()])
    const options = override ?? DEFAULT_OPTIONS

    const request = context.switchToHttp().getRequest<Request>()
    const response = context.switchToHttp().getResponse<Response>()
    const key = this.resolveKey(request, Boolean(override))

    let current: number
    try {
      current = (await this.redis.eval(
        INCREMENT_SCRIPT,
        1,
        key,
        options.windowSeconds,
      )) as number
    } catch (error) {
      this.logger.warn(
        `Rate limit check failed, allowing request through: ${String(error)}`,
      )
      return true
    }

    response.setHeader('X-RateLimit-Limit', options.limit)
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(options.limit - current, 0),
    )

    if (current > options.limit) {
      const ttl = await this.redis.ttl(key)
      response.setHeader('Retry-After', Math.max(ttl, 1))
      throw new HttpException(
        'Too many requests — rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    return true
  }

  private resolveKey(request: Request, isRouteSpecific: boolean): string {
    const user = request.user as IAuthenticatedUser | undefined
    const scope = user?.tenantId
      ? `tenant:${user.tenantId}`
      : `ip:${request.ip}`

    return isRouteSpecific
      ? `ratelimit:${scope}:${request.method}:${request.path}`
      : `ratelimit:${scope}`
  }
}

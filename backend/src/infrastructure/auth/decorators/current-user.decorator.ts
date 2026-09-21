import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import { IAuthenticatedUser } from '@infrastructure/auth/strategies/jwt.strategy'

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): IAuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>()
    return request.user as IAuthenticatedUser
  },
)

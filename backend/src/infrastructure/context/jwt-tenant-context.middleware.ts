import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { NextFunction, Request, Response } from 'express'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'
import { IAccessTokenPayload } from '@use-cases/auth/auth.usecase'

/**
 * Establishes the tenant for authenticated, tenant-scoped resource routes
 * (e.g. TenantNoteController) from the access token's `tenantId` claim.
 * Verifies the token itself — rather than relying on a Guard — because the
 * AsyncLocalStorage context has to wrap the rest of the request pipeline
 * via `next()`, and middleware is the only stage that runs early enough to
 * do that.
 *
 * The claim is trusted directly (no tenants-table lookup) because it's
 * inside a signature we just verified — unlike a header, it can't be
 * forged by the caller. No connection or transaction is held here;
 * repositories open short per-operation ones via TenantTransaction.
 */
@Injectable()
export class JwtTenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantContextStorage: TenantContextStorage,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    let payload: IAccessTokenPayload
    try {
      const token = this.extractBearerToken(req)
      payload = await this.jwtService.verifyAsync<IAccessTokenPayload>(token, {
        secret: this.configService.get<string>('jwtConfig.accessSecret'),
      })
    } catch {
      next(new UnauthorizedException('Missing or invalid access token'))
      return
    }

    req.user = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    }

    this.tenantContextStorage.run({ tenantId: payload.tenantId }, () => {
      next()
    })
  }

  private extractBearerToken(req: Request): string {
    const header = req.header('authorization')
    const [scheme, token] = header?.split(' ') ?? []
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing or invalid access token')
    }
    return token
  }
}

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { NextFunction, Request, Response } from 'express'
import { DataSource } from 'typeorm'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'
import { IAccessTokenPayload } from '@use-cases/auth/auth.usecase'

/**
 * The JWT-backed replacement for the header-based TenantContextMiddleware,
 * used on every tenant-scoped resource route (e.g. TenantNoteController).
 * Verifies the access token itself — rather than relying on a Guard to do
 * it — because the RLS transaction has to wrap the rest of the request
 * pipeline via `next()`, and middleware is the only stage that runs early
 * enough to do that (Guards run after middleware and can't wrap the
 * handler call the way AsyncLocalStorage.run()'s callback does).
 *
 * The token's `tenantId` claim is trusted directly (no tenants-table
 * lookup) because it's inside a signature we just verified — unlike the
 * old header approach, it can't be forged by the caller.
 */
@Injectable()
export class JwtTenantContextMiddleware implements NestMiddleware {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantContextStorage: TenantContextStorage,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = this.extractBearerToken(req)
      const payload = await this.jwtService.verifyAsync<IAccessTokenPayload>(token, {
        secret: this.configService.get<string>('jwtConfig.accessSecret'),
      })

      req.user = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
      }

      const queryRunner = this.dataSource.createQueryRunner()
      await queryRunner.connect()
      await queryRunner.startTransaction()
      await queryRunner.query('SELECT set_config($1, $2, true)', [
        'app.current_tenant_id',
        payload.tenantId,
      ])

      res.on('finish', () => {
        if (queryRunner.isReleased) return
        const settle =
          res.statusCode < 400
            ? queryRunner.commitTransaction()
            : queryRunner.rollbackTransaction()
        void settle.finally(() => queryRunner.release())
      })

      this.tenantContextStorage.run({ tenantId: payload.tenantId, queryRunner }, () => {
        next()
      })
    } catch {
      next(new UnauthorizedException('Missing or invalid access token'))
    }
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

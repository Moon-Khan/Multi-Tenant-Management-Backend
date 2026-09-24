import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { createHash, randomUUID } from 'node:crypto'
import { RefreshTokenRepository } from '@infrastructure/orm/repositories/refresh-token.repository'
import { IUser, UserRole } from '@domain/model/user.interface'

export interface IAuthTokens {
  accessToken: string
  refreshToken: string
}

export interface IJwtSettings {
  accessSecret: string
  accessExpiresIn: string
  refreshSecret: string
  refreshExpiresIn: string
}

export interface IAccessTokenPayload {
  sub: string
  tenantId: string
  role: UserRole
  email: string
}

interface IRefreshTokenPayload {
  sub: string
  tenantId: string
  role: UserRole
  email: string
  jti: string
}

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

// Turns "15m" / "7d" / "3600" (the same strings JwtModule accepts for
// expiresIn) into a concrete expiry Date for the refresh_tokens row.
const resolveExpiryDate = (from: Date, duration: string): Date => {
  const match = /^(\d+)(s|m|h|d)?$/.exec(duration.trim())
  if (!match) {
    throw new Error(`Unsupported duration format: "${duration}"`)
  }
  const value = parseInt(match[1], 10)
  const unit = (match[2] ?? 's') as 's' | 'm' | 'h' | 'd'
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]
  return new Date(from.getTime() + value * unitMs)
}

/**
 * Issues and rotates JWTs. Deliberately does NOT re-read the user from the
 * database on refresh — the refresh token itself carries the same claims
 * (role, email) the access token needs, at the same staleness bound an
 * access token already has (they both go stale for up to their own
 * lifetime). That keeps refresh/logout free of any dependency on the
 * RLS-scoped, tenant-context-bound UserRepository, so those two endpoints
 * don't need a request-scoped tenant transaction at all.
 */
export class AuthUsecase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly jwtSettings: IJwtSettings,
  ) {}

  async issueTokens(user: IUser): Promise<IAuthTokens> {
    const claims: IAccessTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    }
    const accessToken = await this.signAccessToken(claims)
    const refreshToken = await this.issueRefreshToken(claims)
    return { accessToken, refreshToken }
  }

  async refresh(presentedToken: string): Promise<IAuthTokens> {
    const payload = await this.verifyRefreshToken(presentedToken)
    const record = await this.refreshTokenRepository.findById(payload.jti)

    if (!record) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    if (record.revokedAt) {
      await this.refreshTokenRepository.revokeAllForUser(record.userId)
      throw new UnauthorizedException('Refresh token has already been used')
    }

    if (record.tokenHash !== hashToken(presentedToken)) {
      await this.refreshTokenRepository.revokeAllForUser(record.userId)
      throw new UnauthorizedException('Invalid refresh token')
    }

    const claims = {
      sub: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    }
    const accessToken = await this.signAccessToken(claims)
    const refreshToken = await this.issueRefreshToken(claims, record.id)
    return { accessToken, refreshToken }
  }

  getRefreshTokenMaxAgeMs(): number {
    return resolveExpiryDate(
      new Date(0),
      this.jwtSettings.refreshExpiresIn,
    ).getTime()
  }

  async logout(presentedToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefreshToken(presentedToken)
      await this.refreshTokenRepository.revoke(payload.jti)
    } catch {
      // An invalid/expired/already-logged-out token has nothing left to
      // revoke — logout is idempotent either way.
    }
  }

  private signAccessToken(claims: IAccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(claims, {
      secret: this.jwtSettings.accessSecret,
      expiresIn: this.jwtSettings.accessExpiresIn as never,
    })
  }

  private async issueRefreshToken(
    claims: IAccessTokenPayload,
    rotatedFromId?: string,
  ): Promise<string> {
    const jti = randomUUID()
    const payload: IRefreshTokenPayload = { ...claims, jti }
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.jwtSettings.refreshSecret,
      expiresIn: this.jwtSettings.refreshExpiresIn as never,
    })

    await this.refreshTokenRepository.create({
      id: jti,
      userId: claims.sub,
      tenantId: claims.tenantId,
      tokenHash: hashToken(refreshToken),
      expiresAt: resolveExpiryDate(
        new Date(),
        this.jwtSettings.refreshExpiresIn,
      ),
    })

    if (rotatedFromId) {
      await this.refreshTokenRepository.markRotated(rotatedFromId, jti)
    }

    return refreshToken
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<IRefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<IRefreshTokenPayload>(token, {
        secret: this.jwtSettings.refreshSecret,
      })
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }
}

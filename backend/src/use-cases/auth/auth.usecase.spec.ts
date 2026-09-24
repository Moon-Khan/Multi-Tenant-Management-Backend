import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { createHash } from 'node:crypto'
import { AuthUsecase, IJwtSettings } from '@use-cases/auth/auth.usecase'
import { RefreshTokenRepository } from '@infrastructure/orm/repositories/refresh-token.repository'
import { IUser } from '@domain/model/user.interface'
import { IRefreshToken } from '@domain/model/refresh-token.interface'

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

describe('AuthUsecase', () => {
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>
  let jwtService: JwtService
  let usecase: AuthUsecase

  const jwtSettings: IJwtSettings = {
    accessSecret: 'test-access-secret',
    accessExpiresIn: '15m',
    refreshSecret: 'test-refresh-secret',
    refreshExpiresIn: '7d',
  }

  const user: IUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'alice@example.com',
    passwordHash: 'irrelevant-here',
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const storedRecord = (
    overrides: Partial<IRefreshToken> = {},
  ): IRefreshToken => ({
    id: 'jti-1',
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash: '',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    revokedAt: null,
    replacedByTokenId: null,
    createdAt: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    refreshTokenRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      markRotated: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenRepository>
    // Real JwtService — every call already passes an explicit secret, so no
    // module-level config is needed, and using the real signer/verifier is
    // what actually proves the rotation/reuse-detection logic round-trips
    // correctly through a real signature, not a mocked stand-in for one.
    jwtService = new JwtService()
    usecase = new AuthUsecase(refreshTokenRepository, jwtService, jwtSettings)
  })

  describe('issueTokens', () => {
    it('signs an access token carrying the tenant/role claims and persists a hashed refresh token', async () => {
      refreshTokenRepository.create.mockImplementation((data) =>
        Promise.resolve(storedRecord({ ...data })),
      )

      const { accessToken, refreshToken } = await usecase.issueTokens(user)

      const accessPayload = await jwtService.verifyAsync(accessToken, {
        secret: jwtSettings.accessSecret,
      })
      expect(accessPayload).toMatchObject({
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
      })

      expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1)
      const createArg = refreshTokenRepository.create.mock.calls[0][0]
      expect(createArg.userId).toBe(user.id)
      expect(createArg.tenantId).toBe(user.tenantId)
      expect(createArg.tokenHash).toBe(hashToken(refreshToken))
      // Never the raw token — only its hash is ever persisted.
      expect(createArg.tokenHash).not.toBe(refreshToken)
    })
  })

  describe('refresh', () => {
    it('rotates a valid, unused token: issues new tokens and marks the old one replaced', async () => {
      const { refreshToken: firstRefresh } = await usecase.issueTokens(user)
      const record = storedRecord({ tokenHash: hashToken(firstRefresh) })
      refreshTokenRepository.findById.mockResolvedValue(record)
      refreshTokenRepository.create.mockImplementation((data) =>
        Promise.resolve(storedRecord({ ...data })),
      )

      const { accessToken, refreshToken: secondRefresh } =
        await usecase.refresh(firstRefresh)

      expect(secondRefresh).not.toBe(firstRefresh)
      expect(refreshTokenRepository.markRotated).toHaveBeenCalledWith(
        record.id,
        expect.any(String),
      )
      expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled()

      const accessPayload = await jwtService.verifyAsync(accessToken, {
        secret: jwtSettings.accessSecret,
      })
      expect(accessPayload).toMatchObject({
        sub: user.id,
        tenantId: user.tenantId,
      })
    })

    it('rejects an unknown token id', async () => {
      const { refreshToken } = await usecase.issueTokens(user)
      refreshTokenRepository.findById.mockResolvedValue(null)

      await expect(usecase.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('detects reuse of an already-rotated token and revokes the whole family', async () => {
      const { refreshToken } = await usecase.issueTokens(user)
      refreshTokenRepository.findById.mockResolvedValue(
        storedRecord({
          tokenHash: hashToken(refreshToken),
          revokedAt: new Date(),
        }),
      )

      await expect(usecase.refresh(refreshToken)).rejects.toThrow(
        'Refresh token has already been used',
      )
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        user.id,
      )
    })

    it('rejects a token whose hash does not match the stored record and revokes the family', async () => {
      const { refreshToken } = await usecase.issueTokens(user)
      refreshTokenRepository.findById.mockResolvedValue(
        storedRecord({ tokenHash: hashToken('a-completely-different-token') }),
      )

      await expect(usecase.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      )
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        user.id,
      )
    })

    it('rejects a token signed with the wrong secret', async () => {
      const rogueJwtService = new JwtService()
      const forgedToken = await rogueJwtService.signAsync(
        {
          sub: user.id,
          tenantId: user.tenantId,
          role: user.role,
          email: user.email,
          jti: 'x',
        },
        { secret: 'not-the-real-secret', expiresIn: '7d' },
      )

      await expect(usecase.refresh(forgedToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      )
    })
  })

  describe('logout', () => {
    it('revokes the token by its jti', async () => {
      const { refreshToken } = await usecase.issueTokens(user)

      await usecase.logout(refreshToken)

      expect(refreshTokenRepository.revoke).toHaveBeenCalledTimes(1)
    })

    it('is idempotent — an invalid token resolves without throwing', async () => {
      await expect(usecase.logout('not-a-real-token')).resolves.toBeUndefined()
      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled()
    })
  })

  describe('getRefreshTokenMaxAgeMs', () => {
    it('converts "7d" to milliseconds', () => {
      expect(usecase.getRefreshTokenMaxAgeMs()).toBe(7 * 24 * 60 * 60 * 1000)
    })
  })
})

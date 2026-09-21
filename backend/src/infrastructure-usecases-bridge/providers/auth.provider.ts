import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { RefreshTokenRepository } from '@infrastructure/orm/repositories/refresh-token.repository'
import { AuthUsecase, IJwtSettings } from '@use-cases/auth/auth.usecase'
import UsecaseProxy, { AUTH_USECASE_PROXY } from '@infrastructure-usecases-bridge/usecase-proxy'

export function AuthUsecaseProvider() {
  return {
    inject: [RefreshTokenRepository, JwtService, ConfigService],
    provide: AUTH_USECASE_PROXY,
    useFactory: (
      refreshTokenRepository: RefreshTokenRepository,
      jwtService: JwtService,
      configService: ConfigService,
    ) => {
      const jwtSettings: IJwtSettings = {
        accessSecret: configService.get<string>('jwtConfig.accessSecret')!,
        accessExpiresIn: configService.get<string>('jwtConfig.accessExpiresIn')!,
        refreshSecret: configService.get<string>('jwtConfig.refreshSecret')!,
        refreshExpiresIn: configService.get<string>('jwtConfig.refreshExpiresIn')!,
      }
      return new UsecaseProxy(
        new AuthUsecase(refreshTokenRepository, jwtService, jwtSettings),
      )
    },
  }
}

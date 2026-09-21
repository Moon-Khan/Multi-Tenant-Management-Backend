import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { IAccessTokenPayload } from '@use-cases/auth/auth.usecase'

export interface IAuthenticatedUser {
  userId: string
  tenantId: string
  role: IAccessTokenPayload['role']
  email: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwtConfig.accessSecret')!,
    })
  }

  validate(payload: IAccessTokenPayload): IAuthenticatedUser {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    }
  }
}

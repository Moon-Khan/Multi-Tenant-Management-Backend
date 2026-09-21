import { Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import UsecaseProxy, {
  USER_USECASE_PROXY,
} from '@infrastructure-usecases-bridge/usecase-proxy'
import { UserUsecase } from '@use-cases/user/user.usecase'
import { IUser } from '@domain/model/user.interface'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(USER_USECASE_PROXY)
    private readonly userUsecaseProxy: UsecaseProxy<UserUsecase>,
  ) {
    super({ usernameField: 'email', passwordField: 'password' })
  }

  validate(email: string, password: string): Promise<IUser> {
    return this.userUsecaseProxy.getInstance().validateCredentials(email, password)
  }
}

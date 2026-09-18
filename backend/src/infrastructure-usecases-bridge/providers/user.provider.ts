import { UserRepository } from '@infrastructure/orm/repositories/user.repository'
import { UserUsecase } from '@use-cases/user/user.usecase'
import UsecaseProxy, { USER_USECASE_PROXY } from '@infrastructure-usecases-bridge/usecase-proxy'

export function UserUsecaseProvider() {
  return {
    inject: [UserRepository],
    provide: USER_USECASE_PROXY,
    useFactory: (userRepository: UserRepository) =>
      new UsecaseProxy(new UserUsecase(userRepository)),
  }
}

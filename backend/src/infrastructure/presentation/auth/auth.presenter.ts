import { IUser, UserRole } from '@domain/model/user.interface'

export class AuthUserPresenter {
  id: string
  tenantId: string
  email: string
  role: UserRole

  constructor(user: IUser) {
    this.id = user.id
    this.tenantId = user.tenantId
    this.email = user.email
    this.role = user.role
  }
}

export class AuthResponsePresenter {
  accessToken: string
  user: AuthUserPresenter

  constructor(accessToken: string, user: IUser) {
    this.accessToken = accessToken
    this.user = new AuthUserPresenter(user)
  }
}

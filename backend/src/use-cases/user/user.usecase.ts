import { ConflictException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { UserRepository } from '@infrastructure/orm/repositories/user.repository'
import { IUser, UserRole } from '@domain/model/user.interface'

const SALT_ROUNDS = 12

export class UserUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async register(
    tenantId: string,
    email: string,
    password: string,
    role: UserRole = 'member',
  ): Promise<IUser> {
    const existing = await this.userRepository.findByEmail(email)
    if (existing) {
      throw new ConflictException(`Email "${email}" is already registered`)
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    return this.userRepository.create({ tenantId, email, passwordHash, role })
  }

  async validatePassword(user: IUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash)
  }
  async validateCredentials(email: string, password: string): Promise<IUser> {
    const user = await this.userRepository.findByEmail(email)
    if (!user || !(await this.validatePassword(user, password))) {
      throw new UnauthorizedException('Invalid email or password')
    }
    return user
  }
}

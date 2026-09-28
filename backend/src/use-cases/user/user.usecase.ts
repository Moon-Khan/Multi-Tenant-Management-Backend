import { ConflictException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { UserRepository } from '@infrastructure/orm/repositories/user.repository'
import { IUser, UserRole } from '@domain/model/user.interface'

const SALT_ROUNDS = 12
const PG_UNIQUE_VIOLATION = '23505'

const isUniqueViolation = (err: unknown): boolean =>
  (err as { driverError?: { code?: string } } | null)?.driverError?.code ===
  PG_UNIQUE_VIOLATION

export class UserUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async register(
    tenantId: string,
    email: string,
    password: string,
    role: UserRole = 'member',
  ): Promise<IUser> {
    const conflict = new ConflictException(
      `Email "${email}" is already registered`,
    )

    // Each repository call is its own short transaction; the slow bcrypt
    // hash runs between them without holding a DB connection.
    const existing = await this.userRepository.findByEmail(email)
    if (existing) {
      throw conflict
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    try {
      return await this.userRepository.create({
        tenantId,
        email,
        passwordHash,
        role,
      })
    } catch (err) {
      // A concurrent registration for the same email can pass the check
      // above too; the (tenant_id, email) unique constraint catches it.
      if (isUniqueViolation(err)) {
        throw conflict
      }
      throw err
    }
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

import { ConflictException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { UserRepository } from '@infrastructure/orm/repositories/user.repository'
import { IUser, UserRole } from '@domain/model/user.interface'

// Cost factor for bcrypt's key-derivation rounds (2^SALT_ROUNDS iterations).
// 12 is a common baseline in 2026 — high enough to make brute-forcing a
// stolen hash expensive, low enough to keep login latency reasonable.
const SALT_ROUNDS = 12

/**
 * Hashing lives here, not in the controller or the entity:
 *  - Not the controller: password handling is a business rule ("we never
 *    store plaintext"), not an HTTP concern — it must hold even if this
 *    use-case is ever called from a CLI script or a different transport.
 *  - Not the entity: TypeORM entities are just column mappings. Putting
 *    security-sensitive logic on them makes it easy to accidentally bypass
 *    (e.g. `repo.save({ ...user, passwordHash: rawPassword })`).
 */
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

  // bcrypt.hash() embeds a random salt in its own output, so the same
  // password produces a different hash every time — there is no "recompute
  // the hash and check ===" here. bcrypt.compare() re-derives the hash using
  // the salt stored inside `passwordHash` and does a constant-time
  // comparison, which is also what keeps this resistant to timing attacks.
  async validatePassword(user: IUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash)
  }
}

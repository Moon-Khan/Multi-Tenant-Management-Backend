import { Injectable } from '@nestjs/common'
import {
  ICreateUserData,
  IUserRepository,
} from '@domain/repositories/user.repository.interface'
import { IUser } from '@domain/model/user.interface'
import { User } from '@infrastructure/orm/entities/user.entity'
import { TenantTransaction } from '@infrastructure/context/tenant-transaction'

/**
 * Same rationale as TenantNoteRepository: `users` is RLS-protected, so
 * every query runs inside a TenantTransaction (which sets
 * `app.current_tenant_id`), not on Nest's default pooled
 * @InjectRepository(User) connection.
 */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly tenantTransaction: TenantTransaction) {}

  create(data: ICreateUserData): Promise<IUser> {
    return this.tenantTransaction.run((manager) => {
      const repo = manager.getRepository(User)
      return repo.save(repo.create(data))
    })
  }

  findByEmail(email: string): Promise<IUser | null> {
    return this.tenantTransaction.run((manager) =>
      manager.getRepository(User).findOne({ where: { email } }),
    )
  }

  findById(id: string): Promise<IUser | null> {
    return this.tenantTransaction.run((manager) =>
      manager.getRepository(User).findOne({ where: { id } }),
    )
  }
}

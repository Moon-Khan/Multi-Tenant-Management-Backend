import { Injectable } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import {
  ICreateUserData,
  IUserRepository,
} from '@domain/repositories/user.repository.interface'
import { IUser } from '@domain/model/user.interface'
import { User } from '@infrastructure/orm/entities/user.entity'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'

/**
 * Same rationale as TenantNoteRepository: `users` is RLS-protected, so
 * queries must run through the request-scoped, RLS-aware transaction
 * (TenantContextStorage), not Nest's default pooled @InjectRepository(User).
 */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly tenantContextStorage: TenantContextStorage) {}

  private get manager(): EntityManager {
    return this.tenantContextStorage.requireStore().queryRunner.manager
  }

  async create(data: ICreateUserData): Promise<IUser> {
    const repo = this.manager.getRepository(User)
    return repo.save(repo.create(data))
  }

  findByEmail(email: string): Promise<IUser | null> {
    return this.manager.getRepository(User).findOne({ where: { email } })
  }

  findById(id: string): Promise<IUser | null> {
    return this.manager.getRepository(User).findOne({ where: { id } })
  }
}

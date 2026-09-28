import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import {
  ICreateRefreshTokenData,
  IRefreshTokenRepository,
} from '@domain/repositories/refresh-token.repository.interface'
import { IRefreshToken } from '@domain/model/refresh-token.interface'
import { RefreshToken } from '@infrastructure/orm/entities/refresh-token.entity'

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  create(data: ICreateRefreshTokenData): Promise<IRefreshToken> {
    return this.repo.save(
      this.repo.create({ ...data, revokedAt: null, replacedByTokenId: null }),
    )
  }

  findById(id: string): Promise<IRefreshToken | null> {
    return this.repo.findOne({ where: { id } })
  }

  // Inserting the replacement and revoking the old token must be atomic:
  // otherwise a failure between the two leaves either an orphaned new token
  // or an old token that still looks unused.
  rotate(
    data: ICreateRefreshTokenData,
    rotatedFromId: string,
  ): Promise<IRefreshToken> {
    return this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(RefreshToken)
      const created = await repo.save(
        repo.create({ ...data, revokedAt: null, replacedByTokenId: null }),
      )
      await repo.update(
        { id: rotatedFromId },
        { revokedAt: new Date(), replacedByTokenId: data.id },
      )
      return created
    })
  }

  async revoke(id: string): Promise<void> {
    await this.repo.update({ id }, { revokedAt: new Date() })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    )
  }
}

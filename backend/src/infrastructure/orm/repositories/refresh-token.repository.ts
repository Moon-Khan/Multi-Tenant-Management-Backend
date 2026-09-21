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
    return this.repo.save(this.repo.create({ ...data, revokedAt: null, replacedByTokenId: null }))
  }

  findById(id: string): Promise<IRefreshToken | null> {
    return this.repo.findOne({ where: { id } })
  }

  async markRotated(id: string, replacedByTokenId: string): Promise<void> {
    await this.repo.update({ id }, { revokedAt: new Date(), replacedByTokenId })
  }

  async revoke(id: string): Promise<void> {
    await this.repo.update({ id }, { revokedAt: new Date() })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() })
  }
}

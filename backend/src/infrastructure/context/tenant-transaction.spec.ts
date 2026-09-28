import { DataSource, EntityManager, QueryRunner } from 'typeorm'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'
import { TenantTransaction } from '@infrastructure/context/tenant-transaction'

describe('TenantTransaction', () => {
  let storage: TenantContextStorage
  let queryRunner: jest.Mocked<QueryRunner>
  let dataSource: jest.Mocked<DataSource>
  let tx: TenantTransaction
  const manager = {} as EntityManager

  beforeEach(() => {
    storage = new TenantContextStorage()
    queryRunner = {
      manager,
      isTransactionActive: false,
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockImplementation(() => {
        queryRunner.isTransactionActive = true
        return Promise.resolve()
      }),
      query: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<QueryRunner>
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>
    tx = new TenantTransaction(dataSource, storage)
  })

  it('sets the tenant id transaction-locally, commits, and releases', async () => {
    const result = await storage.run({ tenantId: 'tenant-1' }, () =>
      tx.run((m) => {
        expect(m).toBe(manager)
        return Promise.resolve('done')
      }),
    )

    expect(result).toBe('done')
    expect(queryRunner.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.current_tenant_id', 'tenant-1'],
    )
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1)
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled()
    expect(queryRunner.release).toHaveBeenCalledTimes(1)
  })

  it('rolls back, releases, and rethrows when the work fails', async () => {
    const failure = new Error('boom')

    await expect(
      storage.run({ tenantId: 'tenant-1' }, () =>
        tx.run(() => Promise.reject(failure)),
      ),
    ).rejects.toBe(failure)

    expect(queryRunner.commitTransaction).not.toHaveBeenCalled()
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1)
    expect(queryRunner.release).toHaveBeenCalledTimes(1)
  })

  it('refuses to run outside a tenant context, before taking a connection', async () => {
    await expect(tx.run(() => Promise.resolve())).rejects.toThrow(
      /No tenant context is active/,
    )
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled()
  })
})

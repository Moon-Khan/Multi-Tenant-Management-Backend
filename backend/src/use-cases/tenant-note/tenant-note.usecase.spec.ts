import { TenantNoteUsecase } from '@use-cases/tenant-note/tenant-note.usecase'
import { TenantNoteRepository } from '@infrastructure/orm/repositories/tenant-note.repository'
import { ITenantNote } from '@domain/model/tenant-note.interface'

describe('TenantNoteUsecase', () => {
  let tenantNoteRepository: jest.Mocked<TenantNoteRepository>
  let usecase: TenantNoteUsecase

  const note: ITenantNote = {
    id: 'note-1',
    tenantId: 'tenant-1',
    content: 'hello',
    createdAt: new Date(),
  }

  beforeEach(() => {
    tenantNoteRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<TenantNoteRepository>
    usecase = new TenantNoteUsecase(tenantNoteRepository)
  })

  it('create() scopes the write to the tenant id from the request context', async () => {
    tenantNoteRepository.create.mockResolvedValue(note)

    await usecase.create('hello', { tenantId: 'tenant-1' })

    expect(tenantNoteRepository.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      content: 'hello',
    })
  })

  it('findAll() takes no tenantId argument — RLS is what scopes the result set', async () => {
    tenantNoteRepository.findAll.mockResolvedValue([note])

    await expect(usecase.findAll()).resolves.toEqual([note])
    expect(tenantNoteRepository.findAll).toHaveBeenCalledWith()
  })
})

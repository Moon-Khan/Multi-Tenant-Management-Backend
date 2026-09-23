import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { UserUsecase } from '@use-cases/user/user.usecase'
import { UserRepository } from '@infrastructure/orm/repositories/user.repository'
import { IUser } from '@domain/model/user.interface'

describe('UserUsecase', () => {
  let userRepository: jest.Mocked<UserRepository>
  let usecase: UserUsecase

  const baseUser: IUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'alice@example.com',
    passwordHash: '',
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>
    usecase = new UserUsecase(userRepository)
  })

  describe('register', () => {
    it('rejects a duplicate email without hashing the password or touching create', async () => {
      userRepository.findByEmail.mockResolvedValue(baseUser)

      await expect(usecase.register('tenant-1', 'alice@example.com', 'password123')).rejects.toThrow(
        ConflictException,
      )
      expect(userRepository.create).not.toHaveBeenCalled()
    })

    it('stores a bcrypt hash, never the raw password, and defaults role to member', async () => {
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.create.mockImplementation((data) =>
        Promise.resolve({ ...baseUser, ...data }),
      )

      const password = 'supersecret123'
      await usecase.register('tenant-1', 'alice@example.com', password)

      expect(userRepository.create).toHaveBeenCalledTimes(1)
      const createArg = userRepository.create.mock.calls[0][0]
      expect(createArg.tenantId).toBe('tenant-1')
      expect(createArg.email).toBe('alice@example.com')
      expect(createArg.role).toBe('member')
      expect(createArg.passwordHash).not.toBe(password)
      expect(createArg.passwordHash.length).toBeGreaterThan(0)
    })

    it('passes an explicit role through when given one', async () => {
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.create.mockImplementation((data) =>
        Promise.resolve({ ...baseUser, ...data }),
      )

      await usecase.register('tenant-1', 'admin@example.com', 'password123', 'admin')

      expect(userRepository.create.mock.calls[0][0].role).toBe('admin')
    })
  })

  describe('validatePassword', () => {
    it('returns true for the correct password and false for a wrong one', async () => {
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.create.mockImplementation((data) =>
        Promise.resolve({ ...baseUser, ...data }),
      )
      const created = await usecase.register('tenant-1', 'alice@example.com', 'correct-password')

      await expect(usecase.validatePassword(created, 'correct-password')).resolves.toBe(true)
      await expect(usecase.validatePassword(created, 'wrong-password')).resolves.toBe(false)
    })
  })

  describe('validateCredentials', () => {
    it('throws Unauthorized when no account exists for the email — same error as a wrong password', async () => {
      userRepository.findByEmail.mockResolvedValue(null)

      await expect(usecase.validateCredentials('nobody@example.com', 'whatever')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('throws Unauthorized when the password is wrong', async () => {
      userRepository.findByEmail.mockResolvedValueOnce(null)
      userRepository.create.mockImplementation((data) =>
        Promise.resolve({ ...baseUser, ...data }),
      )
      const created = await usecase.register('tenant-1', 'bob@example.com', 'correct-password')
      userRepository.findByEmail.mockResolvedValue(created)

      await expect(
        usecase.validateCredentials('bob@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('returns the user when the password matches', async () => {
      userRepository.findByEmail.mockResolvedValueOnce(null)
      userRepository.create.mockImplementation((data) =>
        Promise.resolve({ ...baseUser, ...data }),
      )
      const created = await usecase.register('tenant-1', 'alice@example.com', 'correct-password')
      userRepository.findByEmail.mockResolvedValue(created)

      await expect(usecase.validateCredentials('alice@example.com', 'correct-password')).resolves.toEqual(
        created,
      )
    })
  })
})

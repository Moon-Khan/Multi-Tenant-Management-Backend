import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from '@infrastructure/auth/guards/roles.guard'

describe('RolesGuard', () => {
  let reflector: jest.Mocked<Reflector>
  let guard: RolesGuard

  const contextWithUser = (user: { role: string } | undefined): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>
    guard = new RolesGuard(reflector)
  })

  it('allows the request through when the route has no @Roles metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)

    expect(guard.canActivate(contextWithUser(undefined))).toBe(true)
  })

  it('allows a caller whose role is in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'member'])

    expect(guard.canActivate(contextWithUser({ role: 'member' }))).toBe(true)
  })

  it('rejects a caller whose role is not in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'member'])

    expect(() => guard.canActivate(contextWithUser({ role: 'viewer' }))).toThrow(
      ForbiddenException,
    )
  })

  it('rejects when there is no authenticated user at all', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin'])

    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException)
  })
})

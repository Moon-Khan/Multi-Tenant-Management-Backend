import { IsEmail, IsString, MinLength } from 'class-validator'

// No `role` field: letting a public, unauthenticated endpoint set its own
// role would let anyone self-register as "admin" for a tenant, defeating
// RBAC entirely. Self-registration always creates a `member` (see
// UserUsecase.register's default) — promoting someone to admin/viewer is a
// privileged action for a future "admin manages users" endpoint, not
// something the registrant decides for themselves.
export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string
}

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string
}

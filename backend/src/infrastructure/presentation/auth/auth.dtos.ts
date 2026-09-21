import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator'
import type { UserRole } from '@domain/model/user.interface'

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsOptional()
  @IsIn(['admin', 'member', 'viewer'])
  role?: UserRole
}

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string
}

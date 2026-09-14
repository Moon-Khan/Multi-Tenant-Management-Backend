import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateTenantNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string
}

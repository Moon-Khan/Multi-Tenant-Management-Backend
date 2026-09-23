import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Inject,
  Post,
  UseInterceptors,
} from '@nestjs/common'
import UsecaseProxy, {
  TENANT_NOTE_USECASE_PROXY,
} from '@infrastructure-usecases-bridge/usecase-proxy'
import { TenantNoteUsecase } from '@use-cases/tenant-note/tenant-note.usecase'
import { CreateTenantNoteDto } from '@infrastructure/presentation/tenant-note/tenant-note.dtos'
import { TenantNotePresenter } from '@infrastructure/presentation/tenant-note/tenant-note.presenter'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'
import { ResponseMessage } from '@infrastructure/response/response-message.decorator'
import { Roles } from '@infrastructure/auth/decorators/roles.decorator'

@UseInterceptors(ClassSerializerInterceptor)
@Controller('tenant-notes')
export class TenantNoteController {
  constructor(
    @Inject(TENANT_NOTE_USECASE_PROXY)
    private readonly proxy: UsecaseProxy<TenantNoteUsecase>,
    private readonly tenantContextStorage: TenantContextStorage,
  ) {}

  // viewer is read-only — creating a note is a write action reserved for
  // admin/member.
  @Roles('admin', 'member')
  @ResponseMessage('Note created successfully')
  @Post()
  async create(@Body() dto: CreateTenantNoteDto): Promise<TenantNotePresenter> {
    const { tenantId } = this.tenantContextStorage.requireStore()
    const note = await this.proxy.getInstance().create(dto.content, { tenantId })
    return new TenantNotePresenter(note)
  }

  @ResponseMessage('Notes fetched successfully')
  @Get()
  async findAll(): Promise<TenantNotePresenter[]> {
    const notes = await this.proxy.getInstance().findAll()
    return notes.map((note) => new TenantNotePresenter(note))
  }
}

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

/**
 * Tenant-scoped resource. TenantContextMiddleware (wired to this controller
 * only, in app.module.ts) has already resolved the X-Tenant-Slug header into
 * a tenant id and opened an RLS-aware transaction by the time any handler
 * here runs — this is the vertical slice that proves the RLS mechanism.
 */
@UseInterceptors(ClassSerializerInterceptor)
@Controller('tenant-notes')
export class TenantNoteController {
  constructor(
    @Inject(TENANT_NOTE_USECASE_PROXY)
    private readonly proxy: UsecaseProxy<TenantNoteUsecase>,
    private readonly tenantContextStorage: TenantContextStorage,
  ) {}

  @Post()
  async create(@Body() dto: CreateTenantNoteDto): Promise<TenantNotePresenter> {
    const { tenantId } = this.tenantContextStorage.requireStore()
    const note = await this.proxy.getInstance().create(dto.content, { tenantId })
    return new TenantNotePresenter(note)
  }

  @Get()
  async findAll(): Promise<TenantNotePresenter[]> {
    const notes = await this.proxy.getInstance().findAll()
    return notes.map((note) => new TenantNotePresenter(note))
  }
}

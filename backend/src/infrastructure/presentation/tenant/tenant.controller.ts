import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common'
import UsecaseProxy, {
  TENANT_USECASE_PROXY,
} from '@infrastructure-usecases-bridge/usecase-proxy'
import { TenantUsecase } from '@use-cases/tenant/tenant.usecase'
import { CreateTenantDto } from '@infrastructure/presentation/tenant/tenant.dtos'
import { TenantPresenter } from '@infrastructure/presentation/tenant/tenant.presenter'

/**
 * Platform-level resource — deliberately NOT behind TenantContextMiddleware
 * (see app.module.ts: the middleware is only wired to TenantNoteController).
 * You can't resolve "which tenant" for an endpoint whose job is creating or
 * listing tenants themselves. In a real system this would additionally sit
 * behind a platform-admin-only guard; that's introduced with RBAC in Week 3.
 */
@UseInterceptors(ClassSerializerInterceptor)
@Controller('tenants')
export class TenantController {
  constructor(
    @Inject(TENANT_USECASE_PROXY)
    private readonly proxy: UsecaseProxy<TenantUsecase>,
  ) {}

  @Post()
  async create(@Body() dto: CreateTenantDto): Promise<TenantPresenter> {
    const tenant = await this.proxy.getInstance().create(dto.name, dto.slug)
    return new TenantPresenter(tenant)
  }

  @Get()
  async findAll(): Promise<TenantPresenter[]> {
    const tenants = await this.proxy.getInstance().findAll()
    return tenants.map((tenant) => new TenantPresenter(tenant))
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantPresenter> {
    const tenant = await this.proxy.getInstance().findOne(id)
    return new TenantPresenter(tenant)
  }
}

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
import { ResponseMessage } from '@infrastructure/response/response-message.decorator'

@UseInterceptors(ClassSerializerInterceptor)
@Controller('tenants')
export class TenantController {
  constructor(
    @Inject(TENANT_USECASE_PROXY)
    private readonly proxy: UsecaseProxy<TenantUsecase>,
  ) {}

  @ResponseMessage('Tenant created successfully')
  @Post()
  async create(@Body() dto: CreateTenantDto): Promise<TenantPresenter> {
    const tenant = await this.proxy.getInstance().create(dto.name, dto.slug)
    return new TenantPresenter(tenant)
  }

  @ResponseMessage('Tenants fetched successfully')
  @Get()
  async findAll(): Promise<TenantPresenter[]> {
    const tenants = await this.proxy.getInstance().findAll()
    return tenants.map((tenant) => new TenantPresenter(tenant))
  }

  @ResponseMessage('Tenant fetched successfully')
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantPresenter> {
    const tenant = await this.proxy.getInstance().findOne(id)
    return new TenantPresenter(tenant)
  }
}

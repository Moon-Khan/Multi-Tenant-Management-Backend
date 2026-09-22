import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import UsecaseProxy, {
  AUTH_USECASE_PROXY,
  USER_USECASE_PROXY,
} from '@infrastructure-usecases-bridge/usecase-proxy'
import { AuthUsecase } from '@use-cases/auth/auth.usecase'
import { UserUsecase } from '@use-cases/user/user.usecase'
import { IUser } from '@domain/model/user.interface'
import { LocalAuthGuard } from '@infrastructure/auth/guards/local-auth.guard'
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard'
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator'
import type { IAuthenticatedUser } from '@infrastructure/auth/strategies/jwt.strategy'
import { RegisterDto, LoginDto } from '@infrastructure/presentation/auth/auth.dtos'
import {
  AuthResponsePresenter,
  AuthUserPresenter,
} from '@infrastructure/presentation/auth/auth.presenter'
import { TenantContextStorage } from '@infrastructure/context/tenant-context.storage'
import { ResponseMessage } from '@infrastructure/response/response-message.decorator'

const REFRESH_COOKIE_NAME = 'refresh_token'

@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_USECASE_PROXY)
    private readonly authProxy: UsecaseProxy<AuthUsecase>,
    @Inject(USER_USECASE_PROXY)
    private readonly userProxy: UsecaseProxy<UserUsecase>,
    private readonly tenantContextStorage: TenantContextStorage,
  ) {}

  @ResponseMessage('User registered successfully')
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthUserPresenter> {
    const { tenantId } = this.tenantContextStorage.requireStore()
    const user = await this.userProxy
      .getInstance()
      .register(tenantId, dto.email, dto.password)
    return new AuthUserPresenter(user)
  }

  @ResponseMessage('Login successful')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() _dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponsePresenter> {
    // LocalStrategy already validated credentials and attached the user.
    const user = req.user as IUser
    return this.issueTokensAndRespond(user, res)
  }

  @ResponseMessage('Token refreshed successfully')
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const presentedToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined
    if (!presentedToken) {
      throw new UnauthorizedException('Missing refresh token')
    }

    const { accessToken, refreshToken } = await this.authProxy
      .getInstance()
      .refresh(presentedToken)
    this.setRefreshCookie(res, refreshToken)
    return { accessToken }
  }


  @ResponseMessage('Logged out successfully')
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const presentedToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined
    if (presentedToken) {
      await this.authProxy.getInstance().logout(presentedToken)
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' })
  }

  @ResponseMessage('Current user fetched successfully')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: IAuthenticatedUser): IAuthenticatedUser {
    return user
  }

  private async issueTokensAndRespond(
    user: IUser,
    res: Response,
  ): Promise<AuthResponsePresenter> {
    const { accessToken, refreshToken } = await this.authProxy
      .getInstance()
      .issueTokens(user)
    this.setRefreshCookie(res, refreshToken)
    return new AuthResponsePresenter(accessToken, user)
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: this.authProxy.getInstance().getRefreshTokenMaxAgeMs(),
    })
  }
}

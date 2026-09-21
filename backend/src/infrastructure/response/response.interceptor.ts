import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Response } from 'express'
import { Observable, map } from 'rxjs'
import { IApiResponse } from '@infrastructure/response/api-response.interface'
import { RESPONSE_MESSAGE_KEY } from '@infrastructure/response/response-message.decorator'

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, IApiResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<IApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>()
    const msg =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ?? 'Success'

    return next.handle().pipe(
      map(
        (data): IApiResponse<T> => ({
          status: response.statusCode,
          msg,
          data: (data ?? null) as T,
        }),
      ),
    )
  }
}

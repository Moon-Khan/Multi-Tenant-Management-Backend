import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { QueryFailedError } from 'typeorm'
import { IApiResponse } from '@infrastructure/response/api-response.interface'

const KNOWN_BODY_KEYS = new Set(['message', 'statusCode', 'error'])

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsHandler')

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const body = this.resolve(exception)

    if (body.status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    response.status(body.status).json(body)
  }

  private resolve(exception: unknown): IApiResponse<unknown> {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception)
    }

    if (exception instanceof QueryFailedError) {
      return { status: HttpStatus.BAD_REQUEST, msg: exception.message, data: null }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      msg: 'Internal server error',
      data: null,
    }
  }

  private fromHttpException(exception: HttpException): IApiResponse<unknown> {
    const status = exception.getStatus()
    const body = exception.getResponse()

    if (typeof body === 'string') {
      return { status, msg: body, data: null }
    }

    const { message } = body as { message?: unknown }

    if (Array.isArray(message)) {
      return { status, msg: 'Validation failed', data: message }
    }

    const msg = (message as string | undefined) ?? exception.message
    const extraEntries = Object.entries(body as Record<string, unknown>).filter(
      ([key]) => !KNOWN_BODY_KEYS.has(key),
    )
    const data = extraEntries.length > 0 ? Object.fromEntries(extraEntries) : null

    return { status, msg, data }
  }
}

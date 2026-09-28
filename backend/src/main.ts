import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const configService = app.get(ConfigService)

  app.set('trust proxy', configService.get<number>('app.trustProxy') ?? 0)

  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    credentials: true,
  })
  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  )

  const port = configService.get<number>('app.port') ?? 3000
  await app.listen(port)

  console.log(`atlas-multitenant-api listening on :${port}`)
}
bootstrap()

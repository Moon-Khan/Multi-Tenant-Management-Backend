import request from 'supertest'
import { createTestApp, ITestApp } from './utils/test-app'

describe('Response envelope (e2e)', () => {
  let ctx: ITestApp

  beforeAll(async () => {
    ctx = await createTestApp()
  })

  afterAll(async () => {
    await ctx.app.close()
  })

  it('wraps a successful response as { status, msg, data }', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/health').expect(200)

    expect(res.body).toMatchObject({ status: 200, msg: 'Service is healthy' })
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'up' })
  })

  it('wraps a 404 for an unknown route in the same shape', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/this-route-does-not-exist')
      .expect(404)

    expect(res.body).toEqual({ status: 404, msg: expect.any(String), data: null })
  })
})

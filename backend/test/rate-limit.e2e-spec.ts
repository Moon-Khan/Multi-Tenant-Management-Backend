import request from 'supertest'
import { clearRateLimits, createTestApp, ITestApp, uniqueSuffix } from './utils/test-app'

describe('Rate limiting (e2e)', () => {
  let ctx: ITestApp
  let tenantSlug: string

  beforeAll(async () => {
    ctx = await createTestApp()
    tenantSlug = `ratelimit-${uniqueSuffix()}`
    await request(ctx.app.getHttpServer())
      .post('/tenants')
      .send({ name: 'Rate Limit Co', slug: tenantSlug })
      .expect(201)
  })

  afterAll(async () => {
    await ctx.app.close()
  })

  it('caps POST /auth/register at 5/min per IP and reports Retry-After on the 6th', async () => {
    await clearRateLimits(ctx.redis)

    for (let i = 0; i < 5; i++) {
      const res = await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .set('x-tenant-slug', tenantSlug)
        .send({ email: `rl-${i}-${uniqueSuffix()}@example.com`, password: 'supersecret123' })

      expect(res.status).toBe(201)
      expect(res.headers['x-ratelimit-limit']).toBe('5')
      expect(Number(res.headers['x-ratelimit-remaining'])).toBe(4 - i)
    }

    const blocked = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', tenantSlug)
      .send({ email: `rl-blocked-${uniqueSuffix()}@example.com`, password: 'supersecret123' })
      .expect(429)

    expect(blocked.body).toMatchObject({
      status: 429,
      msg: expect.stringContaining('Too many requests'),
    })
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('the general per-tenant bucket is independent of the dedicated register bucket', async () => {
    // Register's 5/min bucket is exhausted by the previous test, but a
    // route with no @RateLimit override (e.g. GET /health) shares the
    // default 300/min bucket instead — it must be unaffected.
    await request(ctx.app.getHttpServer()).get('/health').expect(200)
  })
})

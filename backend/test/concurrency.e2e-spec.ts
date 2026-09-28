import request from 'supertest'
import {
  clearRateLimits,
  createTestApp,
  ITestApp,
  uniqueSuffix,
} from './utils/test-app'

// Regression suite for the connection-per-request design this replaced:
// there, each login held one pooled connection for the whole request and
// then needed a second one for the refresh-token insert, so ~10 concurrent
// logins exhausted pg's default pool and hung forever. Now connections are
// held only for each short TenantTransaction, so a burst completes.
describe('Concurrency (e2e)', () => {
  let ctx: ITestApp
  const password = 'supersecret123'
  const tenants: { slug: string; email: string; token: string }[] = []

  beforeAll(async () => {
    ctx = await createTestApp()
    await clearRateLimits(ctx.redis)

    for (const label of ['a', 'b']) {
      const slug = `conc-${label}-${uniqueSuffix()}`
      const email = `conc-${label}-${uniqueSuffix()}@example.com`
      await request(ctx.app.getHttpServer())
        .post('/tenants')
        .send({ name: `Concurrency ${label}`, slug })
        .expect(201)
      await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .set('x-tenant-slug', slug)
        .send({ email, password })
        .expect(201)
      const login = await request(ctx.app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-slug', slug)
        .send({ email, password })
        .expect(200)
      tenants.push({ slug, email, token: login.body.data.accessToken })
    }
  }, 30_000)

  beforeEach(async () => {
    await clearRateLimits(ctx.redis)
  })

  afterAll(async () => {
    await ctx.app.close()
  })

  it('completes a burst of concurrent logins without exhausting the pool', async () => {
    // 10 = the per-IP login limit, and also the old pool size at which the
    // previous design deadlocked.
    const logins = Array.from({ length: 10 }, (_, i) => {
      const { slug, email } = tenants[i % tenants.length]
      return request(ctx.app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-slug', slug)
        .send({ email, password })
    })

    const responses = await Promise.all(logins)

    expect(responses.map((r) => r.status)).toEqual(Array(10).fill(200))
  }, 30_000)

  it('keeps tenants isolated when their writes and reads interleave', async () => {
    const [a, b] = tenants
    const writes = Array.from({ length: 40 }, (_, i) => {
      const tenant = i % 2 === 0 ? a : b
      return request(ctx.app.getHttpServer())
        .post('/tenant-notes')
        .set('Authorization', `Bearer ${tenant.token}`)
        .send({ content: `${tenant.slug} note ${i}` })
    })
    const writeResponses = await Promise.all(writes)
    expect(writeResponses.every((r) => r.status === 201)).toBe(true)

    const reads = Array.from({ length: 40 }, (_, i) => {
      const tenant = i % 2 === 0 ? a : b
      return request(ctx.app.getHttpServer())
        .get('/tenant-notes')
        .set('Authorization', `Bearer ${tenant.token}`)
        .then((res) => ({ tenant, res }))
    })

    for (const { tenant, res } of await Promise.all(reads)) {
      expect(res.status).toBe(200)
      const notes = res.body.data as { content: string }[]
      expect(notes).toHaveLength(20)
      expect(
        notes.every((n) => n.content.startsWith(`${tenant.slug} note`)),
      ).toBe(true)
    }
  }, 30_000)
})

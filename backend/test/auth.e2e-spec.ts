import request from 'supertest'
import { clearRateLimits, createTestApp, ITestApp, uniqueSuffix } from './utils/test-app'

// Extracts just the "name=value" pair supertest's raw Set-Cookie string
// needs stripped down to before it can be sent back as a Cookie header
// (the attributes like Path/HttpOnly aren't valid on an outgoing Cookie).
function extractCookie(setCookieHeaders: string[] | undefined, name: string): string {
  const header = setCookieHeaders?.find((cookie) => cookie.startsWith(`${name}=`))
  if (!header) {
    throw new Error(`Cookie "${name}" not found in Set-Cookie headers`)
  }
  return header.split(';')[0]
}

describe('Auth (e2e)', () => {
  let ctx: ITestApp
  let tenantSlug: string
  const email = `alice-${uniqueSuffix()}@example.com`
  const password = 'supersecret123'

  beforeAll(async () => {
    ctx = await createTestApp()
    await clearRateLimits(ctx.redis)

    tenantSlug = `auth-e2e-${uniqueSuffix()}`
    await request(ctx.app.getHttpServer())
      .post('/tenants')
      .send({ name: 'Auth E2E Co', slug: tenantSlug })
      .expect(201)
  })

  afterAll(async () => {
    await ctx.app.close()
  })

  it('rejects a self-assigned role on register — the RBAC privilege-escalation fix', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', tenantSlug)
      .send({ email: `hacker-${uniqueSuffix()}@example.com`, password, role: 'admin' })
      .expect(400)

    expect(res.body).toMatchObject({ status: 400, msg: 'Validation failed' })
    expect(res.body.data).toContain('property role should not exist')
  })

  it('registers a new user, always defaulting to member', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', tenantSlug)
      .send({ email, password })
      .expect(201)

    expect(res.body).toMatchObject({
      status: 201,
      msg: 'User registered successfully',
      data: { email, role: 'member' },
    })
  })

  it('rejects a duplicate email', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', tenantSlug)
      .send({ email, password })
      .expect(409)
  })

  it('rejects a wrong password on login', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', tenantSlug)
      .send({ email, password: 'wrong-password' })
      .expect(401)
  })

  let accessToken: string
  let refreshCookie: string

  it('logs in and issues an access token plus a refresh cookie', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', tenantSlug)
      .send({ email, password })
      .expect(200)

    expect(res.body.data.accessToken).toEqual(expect.any(String))
    expect(res.body.data.user).toMatchObject({ email, role: 'member' })

    accessToken = res.body.data.accessToken as string
    refreshCookie = extractCookie(res.headers['set-cookie'] as string[] | undefined, 'refresh_token')
  })

  it('rejects a protected route with no access token', async () => {
    await request(ctx.app.getHttpServer()).get('/auth/me').expect(401)
  })

  it('rejects a tampered access token', async () => {
    await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}tampered`)
      .expect(401)
  })

  it('returns the caller identity for a valid token', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.data).toMatchObject({ email, role: 'member' })
  })

  it('rotates the refresh token, and rejects reuse of the token it replaced', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200)

    expect(res.body.data.accessToken).toEqual(expect.any(String))
    const rotatedCookie = extractCookie(
      res.headers['set-cookie'] as string[] | undefined,
      'refresh_token',
    )
    expect(rotatedCookie).not.toBe(refreshCookie)

    // The old cookie was just rotated away — presenting it again is a
    // replay, which must revoke the whole family and fail.
    await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401)

    refreshCookie = rotatedCookie
  })

  it('the reuse above revoked the whole family — even the rotated cookie no longer works', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401)
  })

  it('logout is idempotent and revokes an active refresh token', async () => {
    const login = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', tenantSlug)
      .send({ email, password })
      .expect(200)
    const cookie = extractCookie(login.headers['set-cookie'] as string[] | undefined, 'refresh_token')

    await request(ctx.app.getHttpServer()).post('/auth/logout').set('Cookie', cookie).expect(200)

    await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .expect(401)
  })
})

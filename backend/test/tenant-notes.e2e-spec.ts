import request from 'supertest'
import { Client } from 'pg'
import {
  clearRateLimits,
  createTestApp,
  ITestApp,
  uniqueSuffix,
} from './utils/test-app'

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// There's no API for creating a non-member account (self-registration is
// deliberately locked to "member" — see the RBAC privilege-escalation
// fix), so RBAC tests seed a viewer directly, connecting as the
// table-owning superuser (same role migrations use) so the write bypasses
// RLS entirely — this is test fixture setup, not something that needs to
// prove RLS holds for a write.
//
// Retries briefly: the register call right before this resolves as soon
// as its HTTP response is sent, but TenantContextMiddleware commits that
// request's transaction asynchronously from a `res.on('finish', ...)`
// handler — so immediately after the response, the row can still be a few
// milliseconds from actually being committed and visible.
async function setUserRole(
  tenantId: string,
  email: string,
  role: string,
): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5434),
    user: process.env.MIGRATION_DB_USERNAME ?? 'postgres',
    password: process.env.MIGRATION_DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'multitenant',
  })
  await client.connect()
  try {
    for (let attempt = 0; attempt < 20; attempt++) {
      const result = await client.query(
        'UPDATE users SET role = $1 WHERE tenant_id = $2 AND email = $3 RETURNING id',
        [role, tenantId, email],
      )
      if ((result.rowCount ?? 0) > 0) {
        return
      }
      await sleep(50)
    }
    throw new Error(
      `setUserRole: no user found for tenant ${tenantId} / ${email} after retrying`,
    )
  } finally {
    await client.end()
  }
}

describe('Tenant Notes (e2e)', () => {
  let ctx: ITestApp
  const password = 'supersecret123'
  let tenantAId: string
  let tenantASlug: string
  let tenantBSlug: string
  let memberTokenA: string
  let memberTokenB: string
  let viewerEmail: string

  beforeAll(async () => {
    ctx = await createTestApp()
    await clearRateLimits(ctx.redis)

    tenantASlug = `notes-a-${uniqueSuffix()}`
    tenantBSlug = `notes-b-${uniqueSuffix()}`

    const tenantARes = await request(ctx.app.getHttpServer())
      .post('/tenants')
      .send({ name: 'Notes Tenant A', slug: tenantASlug })
      .expect(201)
    tenantAId = tenantARes.body.data.id as string

    await request(ctx.app.getHttpServer())
      .post('/tenants')
      .send({ name: 'Notes Tenant B', slug: tenantBSlug })
      .expect(201)

    const emailA = `member-a-${uniqueSuffix()}@example.com`
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', tenantASlug)
      .send({ email: emailA, password })
      .expect(201)
    const loginA = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', tenantASlug)
      .send({ email: emailA, password })
      .expect(200)
    memberTokenA = loginA.body.data.accessToken as string

    const emailB = `member-b-${uniqueSuffix()}@example.com`
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', tenantBSlug)
      .send({ email: emailB, password })
      .expect(201)
    const loginB = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', tenantBSlug)
      .send({ email: emailB, password })
      .expect(200)
    memberTokenB = loginB.body.data.accessToken as string

    viewerEmail = `viewer-${uniqueSuffix()}@example.com`
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .set('x-tenant-slug', tenantASlug)
      .send({ email: viewerEmail, password })
      .expect(201)
    await setUserRole(tenantAId, viewerEmail, 'viewer')
  })

  afterAll(async () => {
    await ctx.app.close()
  })

  it('rejects requests with no access token', async () => {
    await request(ctx.app.getHttpServer()).get('/tenant-notes').expect(401)
  })

  it('rejects a tampered access token', async () => {
    await request(ctx.app.getHttpServer())
      .get('/tenant-notes')
      .set('Authorization', `Bearer ${memberTokenA}tampered`)
      .expect(401)
  })

  it('a member can create a note in their own tenant', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/tenant-notes')
      .set('Authorization', `Bearer ${memberTokenA}`)
      .send({ content: 'tenant A note' })
      .expect(201)

    expect(res.body).toMatchObject({
      status: 201,
      msg: 'Note created successfully',
    })
    expect(res.body.data.content).toBe('tenant A note')
  })

  it('RLS isolation: a different tenant sees none of tenant A’s notes', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/tenant-notes')
      .set('Authorization', `Bearer ${memberTokenB}`)
      .expect(200)

    expect(res.body.data).toEqual([])
  })

  it('the owning tenant sees its own note', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/tenant-notes')
      .set('Authorization', `Bearer ${memberTokenA}`)
      .expect(200)

    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].content).toBe('tenant A note')
  })

  it('RBAC: a viewer can read notes but is forbidden from creating one', async () => {
    const login = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-slug', tenantASlug)
      .send({ email: viewerEmail, password })
      .expect(200)
    expect(login.body.data.user.role).toBe('viewer')
    const viewerToken = login.body.data.accessToken as string

    const forbidden = await request(ctx.app.getHttpServer())
      .post('/tenant-notes')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ content: 'should not be allowed' })
      .expect(403)
    expect(forbidden.body.msg).toContain('admin, member')

    const readable = await request(ctx.app.getHttpServer())
      .get('/tenant-notes')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200)
    expect(readable.body.data).toHaveLength(1)
  })
})

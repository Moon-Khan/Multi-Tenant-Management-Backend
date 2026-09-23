import request from 'supertest'
import { DataSource } from 'typeorm'
import { clearRateLimits, createTestApp, ITestApp, uniqueSuffix } from './utils/test-app'

// There's no API for creating a non-member account (self-registration is
// deliberately locked to "member" — see the RBAC privilege-escalation
// fix), so RBAC tests seed a viewer directly. Goes through a real
// SET LOCAL app.current_tenant_id transaction, same as the app's own
// request-scoped middleware, so RLS still applies to the write.
async function setUserRole(
  dataSource: DataSource,
  tenantId: string,
  email: string,
  role: string,
): Promise<void> {
  const queryRunner = dataSource.createQueryRunner()
  await queryRunner.connect()
  await queryRunner.startTransaction()
  try {
    await queryRunner.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId])
    const result = await queryRunner.query(
      'UPDATE users SET role = $1 WHERE tenant_id = $2 AND email = $3 RETURNING id',
      [role, tenantId, email],
    )
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error(
        `setUserRole matched no row for tenant ${tenantId} / ${email} — RLS blocked it or the row doesn't exist`,
      )
    }
    await queryRunner.commitTransaction()
  } finally {
    await queryRunner.release()
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
    await setUserRole(ctx.app.get(DataSource), tenantAId, viewerEmail, 'viewer')
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

    expect(res.body).toMatchObject({ status: 201, msg: 'Note created successfully' })
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

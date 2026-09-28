import { registerAs } from '@nestjs/config'

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Number of reverse-proxy hops to trust for X-Forwarded-For. Must be set
  // behind a load balancer, or request.ip is the proxy's address and every
  // client shares one IP-scoped rate-limit bucket.
  trustProxy: parseInt(process.env.TRUST_PROXY ?? '0', 10),
}))

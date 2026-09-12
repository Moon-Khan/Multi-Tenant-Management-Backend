/**
 * Plain, framework-agnostic view of "the parts of a request use-cases are
 * allowed to know about". Never pass the raw Express Request into a use-case —
 * that would leak an HTTP dependency below the presentation layer.
 */
export interface IRequestContext {
  tenantId: string
  userId?: string
  role?: 'admin' | 'member' | 'viewer'
}

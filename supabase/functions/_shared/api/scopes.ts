/**
 * v1356 — API scopes. Effective access = role / RLS ∩ scopes (D3).
 */
export const API_SCOPES = [
  'projects:read', 'projects:write',
  'tasks:read', 'tasks:write',
  'milestones:read', 'milestones:write',
  'risks:read', 'risks:write',
  'issues:read', 'issues:write',
  'changes:read', 'changes:write',
  'decisions:read', 'decisions:write',
  'actions:read', 'actions:write',
  'stakeholders:read', 'stakeholders:write',
  'timesheets:read', 'timesheets:write',
  'documents:read', 'documents:write',
  'registers:read', 'registers:write',
  'users:read',
  'portfolios:read',
  'programmes:read',
  'budgets:read',
  'evm:read',
] as const

export type ApiScope = (typeof API_SCOPES)[number]

const WRITE_TO_READ: Record<string, string> = {
  'projects:write': 'projects:read',
  'tasks:write': 'tasks:read',
  'milestones:write': 'milestones:read',
  'risks:write': 'risks:read',
  'issues:write': 'issues:read',
  'changes:write': 'changes:read',
  'decisions:write': 'decisions:read',
  'actions:write': 'actions:read',
  'stakeholders:write': 'stakeholders:read',
  'timesheets:write': 'timesheets:read',
  'documents:write': 'documents:read',
  'registers:write': 'registers:read',
}

export function isKnownScope(scope: string): scope is ApiScope {
  return (API_SCOPES as readonly string[]).includes(scope)
}

/** Write scopes imply the matching read scope. */
export function expandScopes(scopes: string[]): Set<string> {
  const out = new Set<string>()
  for (const s of scopes) {
    if (!isKnownScope(s)) continue
    out.add(s)
    const read = WRITE_TO_READ[s]
    if (read) out.add(read)
  }
  return out
}

export function hasScope(granted: string[] | Set<string>, needed: string): boolean {
  const set = granted instanceof Set ? granted : expandScopes(granted)
  return set.has(needed)
}

export function scopesForResource(resource: string, write: boolean): string {
  return `${resource}:${write ? 'write' : 'read'}`
}

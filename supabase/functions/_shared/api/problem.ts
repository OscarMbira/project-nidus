/**
 * v1356 — RFC 9457 problem+json errors (D5).
 */
export type Problem = {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  [key: string]: unknown
}

export function problem(status: number, title: string, detail?: string, extra: Record<string, unknown> = {}): Problem {
  return {
    type: `https://httpstatuses.com/${status}`,
    title,
    status,
    ...(detail ? { detail } : {}),
    ...extra,
  }
}

export function problemResponse(status: number, title: string, detail?: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): Response {
  const body = problem(status, title, detail, extra)
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/problem+json',
      ...headers,
    },
  })
}

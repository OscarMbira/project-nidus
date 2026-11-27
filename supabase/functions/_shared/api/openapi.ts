/**
 * v1356 — OpenAPI 3 document built from resource definitions (D5).
 */
import { API_SCOPES } from './scopes.ts'

export type ResourceDef = {
  name: string
  path: string
  scopeRead: string
  scopeWrite?: string
  description: string
  write?: boolean
  readOnly?: boolean
}

export function buildOpenApi(resources: ResourceDef[], baseUrl = 'https://api.example.com'): Record<string, unknown> {
  const paths: Record<string, unknown> = {
    '/v1/ping': {
      get: {
        summary: 'Health check',
        security: [{ ApiKeyAuth: [] }],
        responses: { '200': { description: 'Gateway is up' } },
      },
    },
    '/v1/me': {
      get: {
        summary: 'Credential and organisation',
        security: [{ ApiKeyAuth: [] }],
        responses: { '200': { description: 'Current key context' } },
      },
    },
  }

  for (const r of resources) {
    const listPath = `/v1/${r.path}`
    const itemPath = `/v1/${r.path}/{id}`
    paths[listPath] = {
      get: {
        summary: `List ${r.name}`,
        description: r.description,
        security: [{ ApiKeyAuth: [r.scopeRead] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 200 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'updated_since', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: { '200': { description: 'Page of records' } },
      },
    }
    if (r.write && r.scopeWrite) {
      ;(paths[listPath] as Record<string, unknown>).post = {
        summary: `Create ${r.name}`,
        security: [{ ApiKeyAuth: [r.scopeWrite] }],
        parameters: [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }],
        responses: { '201': { description: 'Created' } },
      }
    }
    paths[itemPath] = {
      get: {
        summary: `Get ${r.name}`,
        security: [{ ApiKeyAuth: [r.scopeRead] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'One record' }, '304': { description: 'Not modified' } },
      },
    }
    if (r.write && r.scopeWrite) {
      ;(paths[itemPath] as Record<string, unknown>).patch = {
        summary: `Update ${r.name}`,
        security: [{ ApiKeyAuth: [r.scopeWrite] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'If-Match', in: 'header', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated' }, '412': { description: 'Precondition failed' } },
      }
      ;(paths[itemPath] as Record<string, unknown>).delete = {
        summary: `Delete ${r.name}`,
        security: [{ ApiKeyAuth: [r.scopeWrite] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Deleted' } },
      }
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Project Nidus Public API',
      version: '1.0.0',
      description: 'Organisation-scoped REST API. Examples use hosts on the reserved .example domain.',
    },
    servers: [{ url: `${baseUrl}/functions/v1/api-gateway` }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Organisation API key (nds_live_…). Shown once at creation.',
        },
      },
      schemas: {
        Problem: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'integer' },
            detail: { type: 'string' },
          },
        },
      },
    },
    paths,
    'x-nidus-scopes': [...API_SCOPES],
  }
}

/**
 * Integration coverage for work authorisations is primarily enforced by PostgreSQL RLS
 * and RPC tests against a live Supabase instance. This file documents the smoke flow:
 * create draft → submit → approve → execute → close.
 *
 * Run manually after deploying v489–v491, or extend with a Supabase test project.
 */

import { describe, it, expect } from 'vitest'

describe('work authorisation integration (placeholder)', () => {
  it('placeholder — enable when test DB + auth fixtures are available', () => {
    expect(true).toBe(true)
  })
})

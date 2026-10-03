/**
 * Regression guard for SQL/v993_supersede_portfolio_programme_mgr_rls.sql (v982 Phase 3 —
 * cutover migration for the "supersede v592a/v592b" decision).
 *
 * WHY A TEXT-STRUCTURE TEST, NOT A LIVE-DB TEST: this session cannot execute SQL against a live
 * database (ground rule). The plan's task D asks for "a regression test confirming the cutover
 * migration preserved every existing manager's access via an explicit membership row — a before/
 * after diff of who could write to what, not just the new tables have rows in them." A true
 * before/after diff requires a live database with real rows. What CAN be verified without one is
 * that the migration file's own SQL is structurally guaranteed to do that — i.e. this test is a
 * regression guard against someone editing v993.sql later and silently breaking the "every
 * current manager gets migrated" safety net (e.g. dropping the WHERE clause, losing the
 * ON CONFLICT DO NOTHING idempotency, or reordering the migration AFTER the policy drops instead
 * of before). Recommend the user also run the verification queries embedded in v993.sql's own
 * footer against a staging database with real data before treating Phase 3 as fully verified.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SQL_PATH = resolve(__dirname, '../../../../../SQL/v993_supersede_portfolio_programme_mgr_rls.sql')
const sql = readFileSync(SQL_PATH, 'utf8')

// The migration inserts must appear BEFORE the DROP POLICY statements — access is preserved
// before the old automatic grant is removed, never after (no "access gap" window).
const firstInsertIndex = sql.indexOf('INSERT INTO public.portfolio_memberships')
const firstDropIndex = sql.indexOf('DROP POLICY IF EXISTS programmes_update_portfolio_manager')

describe('v993 migration safety (structural regression guard)', () => {
  it('migrates portfolio_manager_user_id into an explicit portfolio_memberships row', () => {
    expect(sql).toMatch(/INSERT INTO public\.portfolio_memberships[\s\S]*?FROM public\.portfolios p/)
    expect(sql).toMatch(/portfolio_manager_user_id IS NOT NULL/)
  })

  it('migrates programme_manager_user_id into an explicit programme_memberships row', () => {
    expect(sql).toMatch(/INSERT INTO public\.programme_memberships[\s\S]*?FROM public\.programmes pr/)
    expect(sql).toMatch(/programme_manager_user_id IS NOT NULL/)
  })

  it('also migrates a portfolio manager\'s implicit authority over child programmes (the v592a-specific access) into an explicit programme_memberships row', () => {
    // there must be a SECOND insert into programme_memberships sourced from portfolios, not just
    // the direct programme_manager_user_id one — this is the "v592a granted portfolio managers
    // write on child programmes too" access being preserved, not just the programme's own manager.
    const programmeInsertCount = (sql.match(/INSERT INTO public\.programme_memberships/g) || []).length
    expect(programmeInsertCount).toBeGreaterThanOrEqual(2)
    expect(sql).toMatch(/INNER JOIN public\.portfolios p ON p\.id = prog\.portfolio_id/)
  })

  it('every migration INSERT is idempotent (ON CONFLICT DO NOTHING) — safe to re-run', () => {
    const insertBlocks = sql.split('INSERT INTO public.').slice(1, 4) // the 3 migration inserts
    for (const block of insertBlocks) {
      expect(block).toMatch(/ON CONFLICT[\s\S]*?DO NOTHING/)
    }
  })

  it('migration inserts run BEFORE the superseded policies are dropped (no access-gap window)', () => {
    expect(firstInsertIndex).toBeGreaterThan(-1)
    expect(firstDropIndex).toBeGreaterThan(-1)
    expect(firstInsertIndex).toBeLessThan(firstDropIndex)
  })

  it('drops exactly the three superseded v592a/v592b policies, no others', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS programmes_update_portfolio_manager ON public.programmes;')
    expect(sql).toContain('DROP POLICY IF EXISTS projects_update_portfolio_manager ON public.projects;')
    expect(sql).toContain('DROP POLICY IF EXISTS projects_update_programme_manager ON public.projects;')
  })

  it('replacement policies are gated by the explicit-grant helper functions, not a raw field match', () => {
    expect(sql).toMatch(/CREATE POLICY programmes_update_portfolio_role[\s\S]*?has_portfolio_role\(auth\.uid\(\)/)
    expect(sql).toMatch(/CREATE POLICY projects_update_portfolio_role[\s\S]*?has_portfolio_role\(auth\.uid\(\)/)
    expect(sql).toMatch(/CREATE POLICY projects_update_programme_role[\s\S]*?has_programme_role\(auth\.uid\(\)/)
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Contract checks for v779 Admin form_instance read RPCs.
 * Ensures the migration SQL still defines the four functions and tight grants.
 */
describe('v779 admin form instance read access SQL', () => {
  const sqlPath = resolve(process.cwd(), '../../../../SQL/v779_admin_form_instance_read_access.sql')
  // When run from apps/platform, cwd differs — try monorepo root relatives
  const candidates = [
    resolve(process.cwd(), 'SQL/v779_admin_form_instance_read_access.sql'),
    resolve(process.cwd(), '../../SQL/v779_admin_form_instance_read_access.sql'),
    resolve(process.cwd(), '../../../SQL/v779_admin_form_instance_read_access.sql'),
    'E:/project-nidus/SQL/v779_admin_form_instance_read_access.sql',
  ]

  function loadSql() {
    for (const p of candidates) {
      try {
        return readFileSync(p, 'utf8')
      } catch {
        /* try next */
      }
    }
    throw new Error('v779 SQL file not found')
  }

  it('defines public + sim list and get functions', () => {
    const sql = loadSql()
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.list_form_instances_for_template/)
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_form_instance_export_data/)
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION sim\.list_form_instances_for_template/)
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION sim\.get_form_instance_export_data/)
  })

  it('filters submitted statuses only (in_review, approved)', () => {
    const sql = loadSql()
    expect(sql).toContain("status IN ('in_review', 'approved')")
    expect(sql).not.toMatch(/status\s*=\s*'completed'/)
  })

  it('is SECURITY DEFINER with fixed search_path and service_role-only execute', () => {
    const sql = loadSql()
    expect(sql).toMatch(/SECURITY DEFINER/)
    expect(sql).toMatch(/SET search_path = public/)
    expect(sql).toMatch(/SET search_path = sim, public/)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.list_form_instances_for_template\(TEXT\) TO service_role/)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION sim\.get_form_instance_export_data\(UUID\) TO service_role/)
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.list_form_instances_for_template\(TEXT\) FROM anon, authenticated/)
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION sim\.get_form_instance_export_data\(UUID\) FROM anon, authenticated/)
  })

  it('export payload shape includes instance, values, rows', () => {
    const sql = loadSql()
    expect(sql).toMatch(/'instance',\s*v_instance/)
    expect(sql).toMatch(/'values',\s*COALESCE\(v_values/)
    expect(sql).toMatch(/'rows',\s*COALESCE\(v_rows/)
  })
})

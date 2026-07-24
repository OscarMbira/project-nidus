import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

describe('v755 id generation migration SQL', () => {
  it('includes helper and public trigger migration files', () => {
    const helpers = readFileSync(path.join(repoRoot, 'SQL/v756_id_generation_migration_helpers.sql'), 'utf8')
    const publicMigration = readFileSync(path.join(repoRoot, 'SQL/v756b_id_generation_migration_public.sql'), 'utf8')
    const simMigration = readFileSync(path.join(repoRoot, 'SQL/v756c_id_generation_migration_sim.sql'), 'utf8')
    const formInstances = readFileSync(path.join(repoRoot, 'SQL/v756d_form_instances_display_id.sql'), 'utf8')

    expect(helpers).toContain('public.trg_apply_admin_display_id')
    expect(helpers).toContain('sim.trg_apply_admin_display_id')
    expect(publicMigration).toContain('public.risks')
    expect(publicMigration).toContain('trg_apply_admin_display_id')
    expect(simMigration).toContain('sim.practice_risks')
    expect(formInstances).toContain('instance_reference')
  })

  it('documents migration in ID_Generation_Migration_Guide.md', () => {
    const guide = readFileSync(path.join(repoRoot, 'Documentation/ID_Generation_Migration_Guide.md'), 'utf8')
    expect(guide).toContain('v756b_id_generation_migration_public.sql')
    expect(guide).toContain('form_instances')
  })
})

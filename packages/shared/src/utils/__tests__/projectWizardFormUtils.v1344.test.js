import { describe, it, expect } from 'vitest'
import { mapDbProjectToWizardForm, wizardFormToProjectUpdatePayload, toMultilineText, getEmptyWizardFormData } from '../projectWizardFormUtils'

describe('project wizard — v1344 fields', () => {
  it('maps objectives (text or legacy JSON array), billing type, priority and PM', () => {
    const f = mapDbProjectToWizardForm({ project_objectives: '["A","B"]', billing_type: 'fixed_price', priority: 'high', project_manager_user_id: 'u1' })
    expect(f).toMatchObject({ project_objectives: 'A\nB', billing_type: 'fixed_price', priority: 'high', project_manager_user_id: 'u1' })
    expect(getEmptyWizardFormData()).toMatchObject({ project_objectives: '', billing_type: '', priority: '', project_manager_user_id: '' })
  })

  it('saves objectives / billing; priority and PM only when set (a blank never clears them)', () => {
    const base = { ...getEmptyWizardFormData(), project_name: 'P', project_objectives: 'A', billing_type: 'time_and_material' }
    const p1 = wizardFormToProjectUpdatePayload(base, 'me')
    expect(p1).toMatchObject({ project_objectives: 'A', billing_type: 'time_and_material' })
    expect(p1).not.toHaveProperty('priority')
    expect(p1).not.toHaveProperty('project_manager_user_id')
    const p2 = wizardFormToProjectUpdatePayload({ ...base, priority: 'critical', project_manager_user_id: 'u2' }, 'me')
    expect(p2).toMatchObject({ priority: 'critical', project_manager_user_id: 'u2' })
  })

  it('toMultilineText handles arrays, JSON text and plain text', () => {
    expect(toMultilineText(['x', ' y '])).toBe('x\ny')
    expect(toMultilineText('plain\ntext')).toBe('plain\ntext')
    expect(toMultilineText(null)).toBe('')
  })
})

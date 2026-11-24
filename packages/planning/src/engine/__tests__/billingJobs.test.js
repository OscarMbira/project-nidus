import { describe, it, expect } from 'vitest'
import { handle as reminders } from '../../../../../supabase/functions/background-job-worker/handlers/billing.overdue_reminders.js'
import { handle as scheduleDue } from '../../../../../supabase/functions/background-job-worker/handlers/billing.schedule_due.js'

describe('billing jobs', () => {
  it('sends each overdue reminder once and marks the step', async () => {
    const calls = []
    const result = await reminders(null, {
      rpc: async (name, args) => {
        calls.push(name)
        if (name === 'billing_overdue_pending') return { data: [{ send_id: 's1', to: 'accounts@company.example', subject: 'Overdue', html: '<p>Due</p>' }] }
        return { data: null, error: args?.p_send_id ? null : { message: 'missing' } }
      },
      invokeFunction: async () => ({ ok: true, status: 200, data: { success: true } }),
    })
    expect(result).toEqual({ processed: 1 })
    expect(calls).toEqual(['billing_overdue_pending', 'billing_mark_reminder_sent'])
  })

  it('asks the schedule function to draft the queued milestone', async () => {
    let payload = null
    const result = await scheduleDue({ milestone_id: 'm1' }, {
      rpc: async (name, args) => { payload = { name, args }; return { data: 1 } },
    })
    expect(payload).toEqual({ name: 'billing_schedule_due', args: { p_context: { milestone_id: 'm1' } } })
    expect(result).toEqual({ processed: 1 })
  })
})
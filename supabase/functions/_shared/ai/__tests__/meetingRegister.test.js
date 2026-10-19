// v1272 Phase 2 — Meeting-to-Register helpers, including the draft-only guarantee.
import { describe, expect, it } from 'vitest'
import {
  anyWordQuery,
  assertStagingTable,
  enrichmentUpdate,
  keywordSimilarity,
  rankCandidates,
  stagingRowsFromExtraction,
  STAGING_TABLES,
} from '../meetingRegister.js'

describe('draft-only guarantee', () => {
  it('allows only the meeting staging tables', () => {
    for (const t of ['comm_meeting_extracted_risks', 'comm_meeting_extracted_issues', 'comm_meeting_action_items',
      'comm_meeting_extracted_decisions', 'comm_meeting_summaries']) {
      expect(assertStagingTable(t)).toBe(t)
    }
    for (const t of ['risks', 'issues', 'project_decisions', 'daily_log_entries', 'practice_risks', 'tasks']) {
      expect(() => assertStagingTable(t)).toThrow()
    }
    expect([...STAGING_TABLES].some((t) => !t.startsWith('comm_meeting_'))).toBe(false)
  })
})

describe('stagingRowsFromExtraction', () => {
  const extraction = {
    risks: [{ title: 'Supplier may deliver late', probability: 'HIGH', impact: 'odd', response: 'avoid', source_quote: 'they might slip' }, { title: '' }],
    issues: [{ title: 'Test rig broken', priority: 'low' }],
    action_items: [{ description: 'Call the supplier', owner_name: 'Ann', due_date: '2026-10-25' }, { description: 'Fix it', due_date: 'next week' }],
    key_decisions: [{ decision: 'Go with vendor B', made_by: 'Sponsor', rationale: 'Cheaper' }],
  }
  it('builds public rows with project_id and safe values', () => {
    const rows = stagingRowsFromExtraction(extraction, { meetingId: 'm1', schema: 'public', projectId: 'p1' })
    expect(rows.risk).toHaveLength(1)
    expect(rows.risk[0]).toMatchObject({ meeting_id: 'm1', project_id: 'p1', suggested_probability: 'high', suggested_impact: 'medium', suggested_response: 'avoid', status: 'pending_review' })
    expect(rows.issue[0].suggested_priority).toBe('low')
    expect(rows.action.map((a) => a.due_date)).toEqual(['2026-10-25', null])
    expect(rows.decision[0]).toMatchObject({ ai_extracted_title: 'Go with vendor B', made_by_name: 'Sponsor' })
  })
  it('uses practice_project_id in the Simulator', () => {
    const rows = stagingRowsFromExtraction(extraction, { meetingId: 'm1', schema: 'sim', projectId: 'pp1' })
    expect(rows.issue[0].practice_project_id).toBe('pp1')
    expect(rows.issue[0].project_id).toBeUndefined()
  })
})

describe('duplicate matching', () => {
  it('builds an any-word search', () => {
    expect(anyWordQuery('The supplier will deliver the steel late')).toBe('supplier or deliver or steel or late')
  })
  it('scores keyword overlap and ranks candidates', () => {
    expect(keywordSimilarity('supplier delivers steel late', 'late steel delivery from supplier')).toBeGreaterThan(0.3)
    expect(keywordSimilarity('budget overrun', 'test rig broken')).toBe(0)
    const ranked = rankCandidates('supplier late steel', [
      { entity_id: 'a', display_id: 'RSK-1', title: 'Budget overrun' },
      { entity_id: 'b', display_id: 'RSK-2', title: 'Steel supplier late' },
    ])
    expect(ranked.map((r) => r.ref)).toEqual(['RSK-2'])
  })
})

describe('enrichmentUpdate', () => {
  const owners = [{ id: 'u1', name: 'Ann Lee' }]
  const candidates = [{ id: 'r9', ref: 'RSK-0042', title: 'Steel late', similarity: 0.5 }]
  const allowed = { priority: ['Low', 'Medium', 'High'] }
  it('keeps only known owners, own candidates and allowed values', () => {
    const u = enrichmentUpdate('risk', {
      owner_id: 'u1', duplicate_of_id: 'r9', mapped_values: { priority: 'high', category: 'made-up' }, due_date: '2026-11-01', note: 'Looks like RSK-0042',
    }, { candidates, owners, allowed, meetingDate: '2026-10-19' })
    expect(u).toMatchObject({ suggested_owner_id: 'u1', duplicate_of_ref: 'RSK-0042', duplicate_score: 0.5, mapped_values: { priority: 'High' }, status: 'enriched' })
  })
  it('drops invented owners, other records and past due dates', () => {
    const u = enrichmentUpdate('action', { owner_id: 'u-x', duplicate_of_id: 'other', due_date: '2026-01-01' },
      { candidates, owners, allowed, meetingDate: '2026-10-19' })
    expect(u.suggested_owner_id).toBeNull()
    expect(u.duplicate_of_id).toBeNull()
    expect(u.suggested_due_date).toBeNull()
    expect(u.status).toBeUndefined() // action items keep their own status
  })
})

describe('meaning-search candidates (Phase 2b)', () => {
  it('keeps the meaning similarity and the keyword overlap separately', async () => {
    const { isDuplicateCandidate } = await import('../embedding.js')
    const ranked = rankCandidates('vendor will ship the steel late', [
      { entity_id: 'a', display_id: 'RSK-7', title: 'Supplier delivery delay', similarity: 0.91, matched: 'meaning' },
      { entity_id: 'b', display_id: 'RSK-8', title: 'Office move', similarity: 0.74, matched: 'meaning' },
    ])
    expect(ranked[0]).toMatchObject({ ref: 'RSK-7', keyword_similarity: 0, similarity: 0.91, matched: 'meaning' })
    expect(ranked.filter(isDuplicateCandidate).map((r) => r.ref)).toEqual(['RSK-7'])
  })
})

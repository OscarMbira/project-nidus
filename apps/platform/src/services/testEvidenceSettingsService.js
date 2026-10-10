import { platformDb } from './supabase/supabaseClient'
import { TEST_EVIDENCE_REQUIREMENT } from '@nidus/shared/utils/testEvidenceRequirement'

// Settings for passed-test evidence (PRD v1204, Slice 4; SQL/v1200).
const ALLOWED = new Set(Object.values(TEST_EVIDENCE_REQUIREMENT))

export async function getOrganisationTestEvidenceDefault(accountId) {
  const { data, error } = await platformDb
    .from('accounts')
    .select('test_evidence_default')
    .eq('id', accountId)
    .maybeSingle()
  if (error) throw error
  return data?.test_evidence_default ?? TEST_EVIDENCE_REQUIREMENT.OPTIONAL
}

export async function setOrganisationTestEvidenceDefault(accountId, value) {
  if (!ALLOWED.has(value)) throw new Error(`Invalid evidence default: ${value}`)
  const { data, error } = await platformDb
    .from('accounts')
    .update({ test_evidence_default: value })
    .eq('id', accountId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** null = inherit the organisation default. */
export async function getProjectTestEvidenceRequirement(projectId) {
  const { data, error } = await platformDb
    .from('projects')
    .select('test_evidence_requirement')
    .eq('id', projectId)
    .maybeSingle()
  if (error) throw error
  return data?.test_evidence_requirement ?? null
}

export async function setProjectTestEvidenceRequirement(projectId, value) {
  if (value !== null && !ALLOWED.has(value)) throw new Error(`Invalid evidence requirement: ${value}`)
  const { data, error } = await platformDb
    .from('projects')
    .update({ test_evidence_requirement: value })
    .eq('id', projectId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Project Documents register (v849) — Captured vs Not-yet-captured process_template rows
 * for a project, using the existing cascade helpers (no new resolution logic).
 */

import {
  listTemplateLibraryNodes,
  TEMPLATE_NODE_LIST_COLUMNS,
} from './pmTemplateLibraryService.js'
import {
  filterProjectOwnTemplateNodes,
  resolveOrgTemplatesAvailableToCopy,
  resolveProjectTierAncestry,
  excludeAlreadyCopiedTemplateFamilies,
} from './pmTemplateInheritanceService.js'
import {
  listArchivedProjectProcessTemplateCopies,
  matchArchivedCopyForCandidate,
  restoreArchivedProjectProcessTemplate,
  archiveProcessTemplateNodeAndContent,
} from './pmTemplateNodeService.js'
import { copyTemplateNodeForAccount } from './pmTemplateCopyService.js'

/** @deprecated use excludeAlreadyCopiedTemplateFamilies — kept for existing test imports */
export const excludeCapturedProcessDocumentFamilies = excludeAlreadyCopiedTemplateFamilies

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ accountId: string, projectId: string, schema?: 'public'|'sim' }} opts
 * @returns {Promise<{ captured: object[], available: object[], ancestry: object }>}
 */
export async function loadProjectDocumentsRegister(db, { accountId, projectId, schema = 'public' } = {}) {
  if (!db || !accountId || !projectId) {
    return { captured: [], available: [], ancestry: { programmeId: null, portfolioId: null } }
  }

  // Three round-trips in parallel — never N archived lookups per candidate.
  const [rows, ancestry, archivedCopies] = await Promise.all([
    listTemplateLibraryNodes(db, accountId, {
      domains: ['process_template'],
      isSystemSynced: false,
      columns: TEMPLATE_NODE_LIST_COLUMNS,
    }),
    resolveProjectTierAncestry(db, projectId, { schema }),
    listArchivedProjectProcessTemplateCopies(db, { accountId, projectId }),
  ])

  const scope = {
    projectId,
    programmeId: ancestry.programmeId,
    portfolioId: ancestry.portfolioId,
  }

  const captured = filterProjectOwnTemplateNodes(rows, projectId).map((r) => ({
    ...r,
    registerStatus: 'captured',
  }))

  const candidates = resolveOrgTemplatesAvailableToCopy(rows, scope)

  const available = candidates.map((candidate) => {
    const archivedNode = matchArchivedCopyForCandidate(candidate, rows, archivedCopies)
    return {
      ...candidate,
      registerStatus: archivedNode ? 'restorable' : 'not_captured',
      archivedNode: archivedNode || null,
    }
  })

  return { captured, available, ancestry }
}

/**
 * Capture (copy-down) or Restore a process document for the project.
 * @returns {Promise<{ node: object, mode: 'capture'|'restore' }>}
 */
export async function captureOrRestoreProjectDocument(
  db,
  {
    accountId,
    projectId,
    sourceNode,
    archivedNode = null,
    userId = null,
  } = {},
) {
  if (!db || !accountId || !projectId || !sourceNode?.id) {
    throw new Error('db, accountId, projectId, and sourceNode are required')
  }

  if (archivedNode?.id) {
    const node = await restoreArchivedProjectProcessTemplate(db, archivedNode)
    return { node, mode: 'restore' }
  }

  const { node } = await copyTemplateNodeForAccount(db, {
    accountId,
    sourceNodeId: sourceNode.id,
    tier: 'project',
    scopeEntityType: 'project',
    scopeEntityId: projectId,
    userId,
  })
  return { node, mode: 'capture' }
}

export async function retireProjectDocument(db, node) {
  return archiveProcessTemplateNodeAndContent(db, node)
}

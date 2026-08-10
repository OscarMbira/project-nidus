import { describe, it, expect } from 'vitest'
import {
  buildNodeChainRootToLeaf,
  mergeFieldLinksByChain,
  listEnabledEffectiveFields,
  hydrateFieldLabelsFromDefinitions,
  pickNearestPublishedDocumentMaster,
  checkAncestorFieldLock,
  resolveStartNodeId,
  resolveNearestTierPerFamily,
  filterProjectOwnTemplateNodes,
  resolveOrgTemplatesForProject,
  resolveOrgTemplatesAvailableToCopy,
  resolveProjectTierAncestry,
} from '../pmTemplateInheritanceService.js'

// Minimal chainable query-builder mock — just enough to exercise
// resolveStartNodeId's fallback query and record its .order() calls, since
// there's no existing Supabase-mocking pattern in this file to reuse.
function makeMockDb({ assignment = null, fallbackNode = { id: 'resolved-node-id' } } = {}) {
  const orderCalls = []
  function chain(table) {
    const node = {
      select: () => node,
      eq: () => node,
      is: () => node,
      in: () => node,
      order: (col, opts) => {
        if (table === 'pm_template_nodes') orderCalls.push([col, opts])
        return node
      },
      limit: () => node,
      maybeSingle: async () => ({
        data: table === 'pm_template_entity_assignment' ? assignment : fallbackNode,
        error: null,
      }),
    }
    return node
  }
  return { db: { from: (table) => chain(table) }, orderCalls }
}

describe('pmTemplateInheritanceService', () => {
  const globalNode = {
    id: 'n-global',
    parent_node_id: null,
    tier: 'pmo',
    status: 'published',
    domain_ref_id: 'doc-global',
    is_current: true,
    is_system_synced: true,
  }
  const pmoNode = {
    id: 'n-pmo',
    parent_node_id: 'n-global',
    tier: 'pmo',
    status: 'published',
    domain_ref_id: 'doc-pmo',
    is_current: true,
  }
  const portfolioNode = {
    id: 'n-pf',
    parent_node_id: 'n-pmo',
    tier: 'portfolio',
    status: 'published',
    domain_ref_id: 'doc-pf',
    is_current: true,
  }
  const projectNode = {
    id: 'n-proj',
    parent_node_id: 'n-pf',
    tier: 'project',
    status: 'draft',
    domain_ref_id: null,
    is_current: true,
  }

  describe('buildNodeChainRootToLeaf', () => {
    it('orders root → leaf and stops on cycles', () => {
      const map = new Map([
        [globalNode.id, globalNode],
        [pmoNode.id, pmoNode],
        [portfolioNode.id, portfolioNode],
        [projectNode.id, projectNode],
      ])
      const chain = buildNodeChainRootToLeaf(map, 'n-proj')
      expect(chain.map((n) => n.id)).toEqual(['n-global', 'n-pmo', 'n-pf', 'n-proj'])
    })

    it('returns empty for missing start', () => {
      expect(buildNodeChainRootToLeaf({}, null)).toEqual([])
    })
  })

  describe('mergeFieldLinksByChain', () => {
    it('applies child enable/required/default/label overrides over parent', () => {
      const rootLinks = [
        {
          node_id: 'n-global',
          custom_field_definition_id: 'f1',
          enabled: true,
          required_override: false,
          default_value_override: 'A',
          label_override: 'Field A',
          display_order: 10,
          is_local: false,
        },
        {
          node_id: 'n-global',
          custom_field_definition_id: 'f2',
          enabled: true,
          required_override: true,
          default_value_override: null,
          label_override: 'Field B',
          display_order: 20,
          is_local: false,
        },
      ]
      const childLinks = [
        {
          node_id: 'n-pf',
          custom_field_definition_id: 'f1',
          enabled: true,
          required_override: true,
          default_value_override: 'B',
          label_override: 'Field A (portfolio)',
          display_order: 5,
          is_local: false,
        },
        {
          node_id: 'n-pf',
          custom_field_definition_id: 'f2',
          enabled: false,
          required_override: null,
          default_value_override: null,
          label_override: null,
          display_order: 20,
          is_local: false,
        },
        {
          node_id: 'n-pf',
          custom_field_definition_id: 'f3',
          enabled: true,
          required_override: false,
          default_value_override: 'local',
          label_override: 'Local',
          display_order: 30,
          is_local: true,
        },
      ]

      const merged = mergeFieldLinksByChain([rootLinks, childLinks])
      expect(merged.get('f1')).toMatchObject({
        enabled: true,
        required: true,
        default_value: 'B',
        label: 'Field A (portfolio)',
        display_order: 5,
      })
      expect(merged.get('f2').enabled).toBe(false)
      expect(merged.get('f3').is_local).toBe(true)

      const enabled = listEnabledEffectiveFields(merged)
      expect(enabled.map((f) => f.custom_field_definition_id)).toEqual(['f1', 'f3'])
    })

    it('keeps parent values when child override is null', () => {
      const merged = mergeFieldLinksByChain([
        [
          {
            node_id: 'n1',
            custom_field_definition_id: 'f1',
            enabled: true,
            required_override: true,
            default_value_override: 'keep',
            label_override: 'Keep',
            display_order: 1,
          },
        ],
        [
          {
            node_id: 'n2',
            custom_field_definition_id: 'f1',
            enabled: true,
            required_override: null,
            default_value_override: null,
            label_override: null,
            display_order: 1,
          },
        ],
      ])
      expect(merged.get('f1')).toMatchObject({
        required: true,
        default_value: 'keep',
        label: 'Keep',
      })
    })

    it('sticky-disable: descendant cannot re-enable a field disabled higher up (v785)', () => {
      const merged = mergeFieldLinksByChain([
        [
          {
            node_id: 'n-pmo',
            custom_field_definition_id: 'f1',
            enabled: false,
            display_order: 1,
          },
        ],
        [
          {
            node_id: 'n-proj',
            custom_field_definition_id: 'f1',
            enabled: true,
            display_order: 1,
          },
        ],
      ])
      expect(merged.get('f1').enabled).toBe(false)
      expect(merged.get('f1').sticky_disabled_by_node_id).toBe('n-pmo')
    })

    it('mandatory lock: descendant cannot disable a field locked higher up (v785)', () => {
      const merged = mergeFieldLinksByChain([
        [
          {
            node_id: 'n-pmo',
            custom_field_definition_id: 'f1',
            enabled: true,
            locked: true,
            display_order: 1,
          },
        ],
        [
          {
            node_id: 'n-proj',
            custom_field_definition_id: 'f1',
            enabled: false,
            display_order: 1,
          },
        ],
      ])
      expect(merged.get('f1')).toMatchObject({
        enabled: true,
        locked: true,
        locked_by_node_id: 'n-pmo',
      })
    })

    it('checkAncestorFieldLock rejects disable when locked by ancestor', () => {
      const chain = [
        { id: 'n-pmo', tier: 'pmo' },
        { id: 'n-proj', tier: 'project' },
      ]
      const fieldMap = mergeFieldLinksByChain([
        [{ node_id: 'n-pmo', custom_field_definition_id: 'f1', enabled: true, locked: true }],
        [{ node_id: 'n-proj', custom_field_definition_id: 'f1', enabled: true }],
      ])
      const result = checkAncestorFieldLock(chain, 'f1', 'n-proj', fieldMap)
      expect(result.ok).toBe(false)
      expect(result.lockedByTier).toBe('pmo')
      expect(result.message).toMatch(/Locked by pmo/i)
    })

    // v787 Issue Register reuses the same merge rules; category is routing-only (resolveStartNodeId).
    it('issue_register cascade: PMO narrows then project narrows further (15→10→8 style)', () => {
      const makeLink = (nodeId, fieldId, enabled) => ({
        node_id: nodeId,
        custom_field_definition_id: fieldId,
        enabled,
        display_order: 0,
      })
      const pmoIds = Array.from({ length: 15 }, (_, i) => `ir-${i + 1}`)
      const programmeDisabled = ['ir-11', 'ir-12', 'ir-13', 'ir-14', 'ir-15']
      const projectDisabled = ['ir-9', 'ir-10']
      const merged = mergeFieldLinksByChain([
        pmoIds.map((id) => makeLink('n-pmo', id, true)),
        programmeDisabled.map((id) => makeLink('n-pf', id, false)),
        projectDisabled.map((id) => makeLink('n-proj', id, false)),
      ])
      const enabled = [...merged.values()].filter((f) => f.enabled)
      expect(enabled).toHaveLength(8)
      expect(merged.get('ir-11').enabled).toBe(false)
      expect(merged.get('ir-11').sticky_disabled_by_node_id).toBe('n-pf')
      expect(merged.get('ir-9').enabled).toBe(false)
      expect(merged.get('ir-1').enabled).toBe(true)
    })

    // v790 Quality Management — three independent categories share the same merge semantics.
    it('quality_* categories: sticky disable works independently per field set (v790)', () => {
      const makeLink = (nodeId, fieldId, enabled) => ({
        node_id: nodeId,
        custom_field_definition_id: fieldId,
        enabled,
        display_order: 0,
      })
      for (const prefix of ['quality_register', 'quality_review', 'quality_inspection']) {
        const merged = mergeFieldLinksByChain([
          [makeLink('n-pmo', `${prefix}-a`, true), makeLink('n-pmo', `${prefix}-b`, true)],
          [makeLink('n-proj', `${prefix}-b`, false)],
        ])
        expect(merged.get(`${prefix}-a`).enabled).toBe(true)
        expect(merged.get(`${prefix}-b`).enabled).toBe(false)
        expect(merged.get(`${prefix}-b`).sticky_disabled_by_node_id).toBe('n-proj')
      }
    })

    // v791 Business Case — same merge; category routing uses business_case.
    it('business_case cascade: sticky disable holds for descendant re-enable (v791)', () => {
      const merged = mergeFieldLinksByChain([
        [
          { node_id: 'n-pmo', custom_field_definition_id: 'bc-1', enabled: true, display_order: 1 },
          { node_id: 'n-pmo', custom_field_definition_id: 'bc-2', enabled: true, display_order: 2 },
        ],
        [
          { node_id: 'n-proj', custom_field_definition_id: 'bc-2', enabled: false, display_order: 2 },
        ],
        [
          { node_id: 'n-leaf', custom_field_definition_id: 'bc-2', enabled: true, display_order: 2 },
        ],
      ])
      expect(merged.get('bc-1').enabled).toBe(true)
      expect(merged.get('bc-2').enabled).toBe(false)
      expect(merged.get('bc-2').sticky_disabled_by_node_id).toBe('n-proj')
    })

    // v792 Change Management — category change_request (SQL v794).
    it('change_request cascade: sticky disable holds for descendant re-enable (v792)', () => {
      const merged = mergeFieldLinksByChain([
        [
          { node_id: 'n-pmo', custom_field_definition_id: 'cr-1', enabled: true, display_order: 1 },
          { node_id: 'n-pmo', custom_field_definition_id: 'cr-2', enabled: true, display_order: 2 },
        ],
        [
          { node_id: 'n-proj', custom_field_definition_id: 'cr-2', enabled: false, display_order: 2 },
        ],
        [
          { node_id: 'n-leaf', custom_field_definition_id: 'cr-2', enabled: true, display_order: 2 },
        ],
      ])
      expect(merged.get('cr-1').enabled).toBe(true)
      expect(merged.get('cr-2').enabled).toBe(false)
      expect(merged.get('cr-2').sticky_disabled_by_node_id).toBe('n-proj')
    })

    // v793 Work Package — category work_package.
    it('work_package cascade: sticky disable holds for descendant re-enable (v793)', () => {
      const merged = mergeFieldLinksByChain([
        [
          { node_id: 'n-pmo', custom_field_definition_id: 'wp-1', enabled: true, display_order: 1 },
          { node_id: 'n-pmo', custom_field_definition_id: 'wp-2', enabled: true, display_order: 2 },
        ],
        [
          { node_id: 'n-proj', custom_field_definition_id: 'wp-2', enabled: false, display_order: 2 },
        ],
        [
          { node_id: 'n-leaf', custom_field_definition_id: 'wp-2', enabled: true, display_order: 2 },
        ],
      ])
      expect(merged.get('wp-1').enabled).toBe(true)
      expect(merged.get('wp-2').enabled).toBe(false)
      expect(merged.get('wp-2').sticky_disabled_by_node_id).toBe('n-proj')
    })
  })

  describe('hydrateFieldLabelsFromDefinitions', () => {
    it('fills missing labels from custom_field_definitions for instance-local fields', async () => {
      const fieldMap = mergeFieldLinksByChain([
        [
          {
            node_id: 'n-proj',
            custom_field_definition_id: 'def-local',
            enabled: true,
            is_local: true,
            label_override: null,
          },
        ],
      ])
      expect(fieldMap.get('def-local').label).toBeNull()

      const db = {
        from: () => ({
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 'def-local',
                  field_code: 'local_note',
                  label: 'Local project note',
                  field_type: 'text',
                },
              ],
              error: null,
            }),
          }),
        }),
      }

      await hydrateFieldLabelsFromDefinitions(db, fieldMap)
      expect(fieldMap.get('def-local').label).toBe('Local project note')
      expect(fieldMap.get('def-local').field_code).toBe('local_note')
      expect(fieldMap.get('def-local').field_type).toBe('text')
    })

    it('does not overwrite an existing label_override', async () => {
      const fieldMap = mergeFieldLinksByChain([
        [
          {
            node_id: 'n-pmo',
            custom_field_definition_id: 'def-1',
            enabled: true,
            label_override: 'Purpose & Justification',
          },
        ],
      ])
      const db = {
        from: () => ({
          select: () => ({
            in: async () => ({
              data: [{ id: 'def-1', field_code: 'purpose', label: 'Purpose', field_type: 'text' }],
              error: null,
            }),
          }),
        }),
      }
      await hydrateFieldLabelsFromDefinitions(db, fieldMap)
      expect(fieldMap.get('def-1').label).toBe('Purpose & Justification')
      expect(fieldMap.get('def-1').field_code).toBe('purpose')
    })
  })

  describe('pickNearestPublishedDocumentMaster', () => {
    it('returns the leaf-most published node with domain_ref_id', () => {
      const master = pickNearestPublishedDocumentMaster([
        globalNode,
        pmoNode,
        portfolioNode,
        projectNode,
      ])
      expect(master?.id).toBe('n-pf')
      expect(master?.domain_ref_id).toBe('doc-pf')
    })

    it('falls back to PMO/Global when portfolio has no published ref', () => {
      const master = pickNearestPublishedDocumentMaster([
        globalNode,
        pmoNode,
        { ...portfolioNode, status: 'draft', domain_ref_id: null },
      ])
      expect(master?.id).toBe('n-pmo')
    })

    it('returns null when nothing published with a ref', () => {
      expect(
        pickNearestPublishedDocumentMaster([
          { ...globalNode, status: 'draft', domain_ref_id: null },
        ]),
      ).toBeNull()
    })
  })

  describe('parent-chain shapes (v783 create-time inheritance)', () => {
    it('Project → Programme → Portfolio → PMO resolves leaf-to-root order', () => {
      const programmeNode = {
        id: 'n-prog',
        parent_node_id: 'n-pf',
        tier: 'programme',
        status: 'published',
        is_current: true,
      }
      const map = new Map([
        [globalNode.id, globalNode],
        [pmoNode.id, pmoNode],
        [portfolioNode.id, portfolioNode],
        [programmeNode.id, programmeNode],
        [
          'n-proj-under-prog',
          {
            id: 'n-proj-under-prog',
            parent_node_id: 'n-prog',
            tier: 'project',
            status: 'draft',
            is_current: true,
          },
        ],
      ])
      const chain = buildNodeChainRootToLeaf(map, 'n-proj-under-prog')
      expect(chain.map((n) => n.tier)).toEqual(['pmo', 'pmo', 'portfolio', 'programme', 'project'])
    })

    it('Project → Portfolio (no programme) skips programme tier', () => {
      const map = new Map([
        [pmoNode.id, pmoNode],
        [portfolioNode.id, portfolioNode],
        [projectNode.id, projectNode],
      ])
      const chain = buildNodeChainRootToLeaf(map, 'n-proj')
      expect(chain.map((n) => n.tier)).toEqual(['pmo', 'portfolio', 'project'])
      expect(chain.some((n) => n.tier === 'programme')).toBe(false)
    })

    it('standalone Project under PMO only', () => {
      const standalone = {
        id: 'n-solo',
        parent_node_id: 'n-pmo',
        tier: 'project',
        status: 'draft',
        is_current: true,
      }
      const map = new Map([
        [pmoNode.id, pmoNode],
        [standalone.id, standalone],
      ])
      expect(buildNodeChainRootToLeaf(map, 'n-solo').map((n) => n.tier)).toEqual(['pmo', 'project'])
    })

    it('Sub-Portfolio under parent Portfolio', () => {
      const sub = {
        id: 'n-sub',
        parent_node_id: 'n-pf',
        tier: 'sub_portfolio',
        status: 'draft',
        is_current: true,
      }
      const map = new Map([
        [pmoNode.id, pmoNode],
        [portfolioNode.id, portfolioNode],
        [sub.id, sub],
      ])
      expect(buildNodeChainRootToLeaf(map, 'n-sub').map((n) => n.tier)).toEqual([
        'pmo',
        'portfolio',
        'sub_portfolio',
      ])
    })
  })

  describe('resolveStartNodeId fallback tiebreak (v807 Gap 2/3)', () => {
    it('prefers the account\'s own copy (is_system_synced ascending) for portfolio_template', async () => {
      const { db, orderCalls } = makeMockDb()
      await resolveStartNodeId(db, 'portfolio', 'pf-1', 'portfolio_template', { accountId: 'acct-1' })
      expect(orderCalls[0]).toEqual(['is_system_synced', { ascending: true }])
    })

    it('prefers the account\'s own copy for programme_template', async () => {
      const { db, orderCalls } = makeMockDb()
      await resolveStartNodeId(db, 'programme', 'pg-1', 'programme_template', { accountId: 'acct-1' })
      expect(orderCalls[0]).toEqual(['is_system_synced', { ascending: true }])
    })

    it('prefers the account\'s own copy for project_template', async () => {
      const { db, orderCalls } = makeMockDb()
      await resolveStartNodeId(db, 'project', 'proj-1', 'project_template', { accountId: 'acct-1' })
      expect(orderCalls[0]).toEqual(['is_system_synced', { ascending: true }])
    })

    it('leaves fields resolving Global-first, unchanged (v805 decision, not revisited)', async () => {
      const { db, orderCalls } = makeMockDb()
      await resolveStartNodeId(db, 'project', 'proj-1', 'fields', { accountId: 'acct-1' })
      expect(orderCalls[0]).toEqual(['is_system_synced', { ascending: false }])
    })

    it('leaves opa resolving Global-first, unchanged', async () => {
      const { db, orderCalls } = makeMockDb()
      await resolveStartNodeId(db, 'project', 'proj-1', 'opa', { accountId: 'acct-1' })
      expect(orderCalls[0]).toEqual(['is_system_synced', { ascending: false }])
    })
  })

  // v824: "PMO → Portfolio → Programme → Project, nearest tier wins" for a PM's project view.
  describe('resolveNearestTierPerFamily', () => {
    // One template family: Global → PMO copy → Portfolio fork → Project fork.
    const pmoRow = { id: 'pmo-1', parent_node_id: 'global-1', tier: 'pmo', scope_entity_type: 'account', scope_entity_id: null }
    const portfolioRow = { id: 'pf-1', parent_node_id: 'pmo-1', tier: 'portfolio', scope_entity_type: 'portfolio', scope_entity_id: 'portfolio-A' }
    const projectRow = { id: 'proj-1', parent_node_id: 'pf-1', tier: 'project', scope_entity_type: 'project', scope_entity_id: 'project-X' }
    // Unrelated second family: only a PMO copy exists.
    const otherPmoRow = { id: 'pmo-2', parent_node_id: 'global-2', tier: 'pmo', scope_entity_type: 'account', scope_entity_id: null }

    it('picks the PMO row when nothing more specific applies', () => {
      const result = resolveNearestTierPerFamily([pmoRow, otherPmoRow], { projectId: 'project-X' })
      expect(result.map((r) => r.id).sort()).toEqual(['pmo-1', 'pmo-2'])
    })

    it('prefers the project\'s own copy over its ancestors', () => {
      const result = resolveNearestTierPerFamily([pmoRow, portfolioRow, projectRow], {
        projectId: 'project-X',
        portfolioId: 'portfolio-A',
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('proj-1')
    })

    it('prefers the portfolio tier over PMO when no project-specific copy exists', () => {
      const result = resolveNearestTierPerFamily([pmoRow, portfolioRow], {
        projectId: 'project-X',
        portfolioId: 'portfolio-A',
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('pf-1')
    })

    it('excludes a portfolio-tier row scoped to a different portfolio than this project\'s', () => {
      const result = resolveNearestTierPerFamily([pmoRow, portfolioRow], {
        projectId: 'project-X',
        portfolioId: 'portfolio-OTHER',
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('pmo-1')
    })

    it('excludes a project-tier row scoped to a different project', () => {
      const result = resolveNearestTierPerFamily([pmoRow, projectRow], { projectId: 'project-OTHER' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('pmo-1')
    })

    it('returns an empty array for an empty input', () => {
      expect(resolveNearestTierPerFamily([], { projectId: 'project-X' })).toEqual([])
    })

    it('v852: blank local forms cascade — portfolio blank applies until project has its own', () => {
      const portfolioBlank = {
        id: 'blank-pf',
        parent_node_id: null,
        tier: 'portfolio',
        scope_entity_type: 'portfolio',
        scope_entity_id: 'portfolio-A',
        domain: 'form_template',
      }
      const projectBlank = {
        id: 'blank-proj',
        parent_node_id: null,
        tier: 'project',
        scope_entity_type: 'project',
        scope_entity_id: 'project-X',
        domain: 'form_template',
      }
      const atProjectWithoutOwn = resolveNearestTierPerFamily([portfolioBlank], {
        projectId: 'project-X',
        portfolioId: 'portfolio-A',
      })
      expect(atProjectWithoutOwn.map((r) => r.id)).toEqual(['blank-pf'])

      const atProjectWithOwn = resolveNearestTierPerFamily([portfolioBlank, projectBlank], {
        projectId: 'project-X',
        portfolioId: 'portfolio-A',
      })
      // Separate families (both parent_node_id null) — both appear; project does not replace portfolio blank of a different family.
      expect(atProjectWithOwn.map((r) => r.id).sort()).toEqual(['blank-pf', 'blank-proj'])
    })
  })

  describe('filterProjectOwnTemplateNodes / resolveOrgTemplatesForProject (v844)', () => {
    const pmoRow = {
      id: 'pmo-1',
      parent_node_id: null,
      tier: 'pmo',
      scope_entity_type: 'account',
      scope_entity_id: null,
    }
    const projectRow = {
      id: 'proj-1',
      parent_node_id: 'pmo-1',
      tier: 'project',
      scope_entity_id: 'project-X',
    }

    it('filterProjectOwnTemplateNodes returns only this project\'s copies', () => {
      expect(filterProjectOwnTemplateNodes([pmoRow, projectRow], 'project-X')).toEqual([projectRow])
      expect(filterProjectOwnTemplateNodes([pmoRow, projectRow], 'project-OTHER')).toEqual([])
      expect(filterProjectOwnTemplateNodes([pmoRow, projectRow], null)).toEqual([])
    })

    it('resolveOrgTemplatesForProject excludes project-own copies so PMO remains for copy-down', () => {
      const result = resolveOrgTemplatesForProject([pmoRow, projectRow], { projectId: 'project-X' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('pmo-1')
    })

    it('resolveOrgTemplatesAvailableToCopy hides families already copied to the project', () => {
      const otherPmo = {
        id: 'pmo-2',
        parent_node_id: 'global-2',
        tier: 'pmo',
        scope_entity_type: 'account',
        scope_entity_id: null,
      }
      const result = resolveOrgTemplatesAvailableToCopy([pmoRow, projectRow, otherPmo], {
        projectId: 'project-X',
      })
      expect(result.map((r) => r.id)).toEqual(['pmo-2'])
    })
  })

  // v824 ancestry must use join tables — projects.programme_id does not exist (console 400/403).
  describe('resolveProjectTierAncestry', () => {
    function makeAncestryDb(rowsByTable) {
      const queried = []
      return {
        queried,
        db: {
          from(table) {
            queried.push(table)
            const row = rowsByTable[table] ?? null
            const node = {
              select: () => node,
              eq: () => node,
              limit: () => node,
              maybeSingle: async () => ({ data: row, error: null }),
            }
            return node
          },
        },
      }
    }

    it('resolves public ancestry via programme_projects and portfolio_projects (not projects.programme_id)', async () => {
      const { db, queried } = makeAncestryDb({
        programme_projects: { programme_id: 'prog-1' },
        portfolio_projects: { portfolio_id: 'pf-1' },
      })
      const result = await resolveProjectTierAncestry(db, 'proj-1', { schema: 'public' })
      expect(result).toEqual({ programmeId: 'prog-1', portfolioId: 'pf-1' })
      expect(queried).toContain('programme_projects')
      expect(queried).toContain('portfolio_projects')
      expect(queried).not.toContain('projects')
    })

    it('falls back to programmes.portfolio_id when portfolio_projects has no row', async () => {
      const { db, queried } = makeAncestryDb({
        programme_projects: { programme_id: 'prog-1' },
        portfolio_projects: null,
        programmes: { portfolio_id: 'pf-from-prog' },
      })
      const result = await resolveProjectTierAncestry(db, 'proj-1', { schema: 'public' })
      expect(result).toEqual({ programmeId: 'prog-1', portfolioId: 'pf-from-prog' })
      expect(queried).toContain('programmes')
    })

    it('returns nulls when the project has no programme/portfolio links', async () => {
      const { db } = makeAncestryDb({
        programme_projects: null,
        portfolio_projects: null,
      })
      const result = await resolveProjectTierAncestry(db, 'proj-1', { schema: 'public' })
      expect(result).toEqual({ programmeId: null, portfolioId: null })
    })
  })
})

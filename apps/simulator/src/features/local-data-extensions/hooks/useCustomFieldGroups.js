import { useState, useEffect, useCallback } from 'react'
import {
  listPublishedGroupsForScreen,
  listInstances,
  listInstanceValues,
  listGroupFields,
  createInstance,
  deleteInstance,
  upsertGroupCell,
} from '../api/customFieldGroupsApi'
import { listOptions } from '../api/customFieldsApi'
import { isOptionBackedType } from '../utils/fieldTypeRegistry'

export function useCustomFieldGroups(platformDb, accountId, screenCode, ctx, userInternalId) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [rowsByGroup, setRowsByGroup] = useState({})

  const load = useCallback(async () => {
    const projOk = ctx?.projectId || ctx?.practiceProjectId
    if (!platformDb || !accountId || !screenCode || !projOk || !ctx?.entityId) {
      setGroups([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const gRes = await listPublishedGroupsForScreen(platformDb, accountId, screenCode)
      const gs = gRes.data || []
      setGroups(gs)
      const next = {}
      for (const g of gs) {
        const inst = await listInstances(platformDb, {
          projectId: ctx.projectId,
          practiceProjectId: ctx.practiceProjectId,
          groupId: g.id,
          entityType: ctx.entityType,
          entityId: ctx.entityId,
        })
        const instances = inst.data || []
        const enriched = []
        for (const ins of instances) {
          const vals = await listInstanceValues(platformDb, ins.id)
          const byField = {}
          for (const v of vals.data || []) byField[v.field_definition_id] = v
          enriched.push({ ...ins, valuesByFieldId: byField })
        }
        next[g.id] = enriched
      }
      setRowsByGroup(next)
    } finally {
      setLoading(false)
    }
  }, [platformDb, accountId, screenCode, ctx?.projectId, ctx?.practiceProjectId, ctx?.entityType, ctx?.entityId])

  useEffect(() => {
    load()
  }, [load])

  const addRow = useCallback(
    async (group, sortOrder) => {
      const row = {
        account_id: ctx.accountId,
        group_id: group.id,
        entity_type: ctx.entityType,
        entity_id: ctx.entityId,
        row_sort_order: sortOrder,
      }
      if (ctx.practiceProjectId) row.practice_project_id = ctx.practiceProjectId
      else row.project_id = ctx.projectId
      const res = await createInstance(platformDb, row, userInternalId)
      if (!res.success) return res
      await load()
      return res
    },
    [platformDb, ctx, userInternalId, load]
  )

  const removeRow = useCallback(
    async (instanceId) => {
      const res = await deleteInstance(platformDb, instanceId)
      if (!res.success) return res
      await load()
      return res
    },
    [platformDb, load]
  )

  const saveCell = useCallback(
    async (instanceId, fieldDefinitionId, fieldType, rawValue) => {
      return upsertGroupCell(platformDb, {
        group_instance_id: instanceId,
        field_definition_id: fieldDefinitionId,
        field_type: fieldType,
        raw_value: rawValue,
      })
    },
    [platformDb]
  )

  const loadGroupFieldDefs = useCallback(
    async (groupId) => {
      const res = await listGroupFields(platformDb, groupId)
      const defs = (res.data || []).map((r) => r.custom_field_definitions).filter(Boolean)
      const out = []
      for (const d of defs) {
        if (isOptionBackedType(d.field_type)) {
          const o = await listOptions(platformDb, d.id)
          out.push({ ...d, options: o.data || [] })
        } else {
          out.push({ ...d, options: [] })
        }
      }
      return out
    },
    [platformDb]
  )

  return { groups, loading, rowsByGroup, reload: load, addRow, removeRow, saveCell, loadGroupFieldDefs }
}

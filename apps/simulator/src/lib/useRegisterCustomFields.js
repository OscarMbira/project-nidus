/**
 * Organisation custom fields for one Local Register (v1311) — loads the fields attached to the
 * register for the user's organisation (as register-shaped fields keyed `cf__<id>`), the
 * organisation's field library, and wraps add/attach. App-bound (service binding), so it lives
 * here; identical to the Platform copy apart from its LDE admin link.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { toRegisterField } from '@nidus/shared/utils/registerCustomFields'
import {
  listRegisterCustomFields,
  listCustomFieldLibrary,
  addRegisterCustomField,
  attachRegisterCustomField,
} from '../services/localRegisterCustomFieldService'

/** Local Data Extensions page where PMO admins rename, retire or detach fields (PRD D8). */
export const CUSTOM_FIELDS_MANAGE_PATH = '/simulator/local-data-extensions/field-definitions'

const EMPTY = { registerId: null, fields: [], used: 0, limit: 0, canManage: false, loading: true, error: '' }

export function useRegisterCustomFields(register) {
  const registerId = register?.id || null
  const [state, setState] = useState(EMPTY)
  const [library, setLibrary] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const accountRef = useRef(null)

  const resolveAccount = useCallback(async () => {
    if (!accountRef.current) accountRef.current = await getCurrentUserAccountId()
    return accountRef.current
  }, [])

  const load = useCallback(async () => {
    if (!registerId) return
    const accountId = await resolveAccount()
    const res = await listRegisterCustomFields(registerId, accountId)
    const data = res.data || {}
    setState({
      registerId,
      fields: (data.fields || []).map((f) => toRegisterField(f, registerId)),
      used: data.used || 0,
      limit: data.limit || 0,
      canManage: !!data.can_manage,
      loading: false,
      error: res.success ? '' : res.error,
    })
  }, [registerId, resolveAccount])

  useEffect(() => {
    load()
  }, [load])

  // Data from a previously viewed register counts as not loaded yet.
  const current = state.registerId === registerId ? state : EMPTY

  const loadLibrary = useCallback(async () => {
    if (!registerId) return
    setLibraryLoading(true)
    const res = await listCustomFieldLibrary(registerId, await resolveAccount())
    setLibrary(res.data || [])
    setLibraryLoading(false)
  }, [registerId, resolveAccount])

  const attach = useCallback(async (definitionId) => {
    const res = await attachRegisterCustomField(registerId, await resolveAccount(), definitionId)
    if (!res.success) return { success: false, error: res.error }
    await Promise.all([load(), loadLibrary()])
    return { success: true, field: res.data?.field }
  }, [registerId, resolveAccount, load, loadLibrary])

  const create = useCallback(async (input) => {
    const res = await addRegisterCustomField(registerId, await resolveAccount(), input)
    if (!res.success) return { success: false, error: res.error }
    if (res.data?.status === 'duplicate') {
      await loadLibrary()
      return { success: false, status: 'duplicate', existing: res.data.existing }
    }
    await Promise.all([load(), loadLibrary()])
    return { success: true, status: 'created', field: res.data?.field }
  }, [registerId, resolveAccount, load, loadLibrary])

  const { registerId: _loadedFor, ...fieldState } = current
  return { ...fieldState, library, libraryLoading, loadLibrary, attach, create, reload: load, managePath: CUSTOM_FIELDS_MANAGE_PATH }
}

import { useCallback, useEffect, useState } from 'react'
import { useLdeContext } from './LocalDataExtensionsRoutes'
import { listDefinitions } from '../api/customFieldsApi'
import FieldPermissionMatrix from '../components/FieldPermissionMatrix'
import { WORKFLOW_STATUS } from '../utils/customFieldConstants'

export default function FieldPermissionsPage() {
  const { platformDb, rolesDb, accountId } = useLdeContext()
  const rolesClient = rolesDb ?? platformDb
  const [roles, setRoles] = useState([])
  const [fields, setFields] = useState([])

  const load = useCallback(async () => {
    const { data: roleRows } = await rolesClient
      .from('roles')
      .select('id, role_name, role_display_name')
      .eq('is_active', true)
      .order('role_name')
      .limit(50)

    const res = await listDefinitions(platformDb, accountId)
    const published = (res.data || []).filter((d) => d.workflow_status === WORKFLOW_STATUS.PUBLISHED)

    setRoles(roleRows || [])
    setFields(published)
  }, [platformDb, rolesClient, accountId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <FieldPermissionMatrix platformDb={platformDb} accountId={accountId} roles={roles} fields={fields} onSaved={load} />
  )
}

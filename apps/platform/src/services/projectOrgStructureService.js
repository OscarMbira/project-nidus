import { platformDb } from '@nidus/supabase'

export async function getProjectOrgStructure(projectId) {
  const { data, error } = await platformDb
    .from('project_memberships')
    .select(`
      user_id,
      users:users!project_memberships_user_id_fkey ( id, full_name, email, avatar_url ),
      role:project_roles ( role_name, role_display_name )
    `)
    .eq('project_id', projectId)
    .eq('is_active', true)
    .or('invitation_status.eq.accepted,invitation_status.is.null')
  if (error) throw error
  return data || []
}

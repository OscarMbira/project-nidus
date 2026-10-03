/**
 * A project manager is often stored on projects.project_manager_user_id (and an owner on
 * owner_user_id) without a project_memberships row. Those projects must still appear in
 * the current-project list — memberships alone made PMs look unassigned.
 * @param {Array} membershipRows
 * @param {Array} ledProjects
 * @param {string} internalUserId
 */
export function unionProjectRoleRows(membershipRows, ledProjects, internalUserId) {
  const ledById = new Map((ledProjects || []).filter((project) => project?.id).map((project) => [project.id, project]))
  const rows = (membershipRows || []).map((row) => {
    if (row?.projects || !row?.project_id) return row
    const led = ledById.get(row.project_id)
    if (!led) return row
    return {
      ...row,
      projects: { project_name: led.project_name, project_code: led.project_code },
    }
  })
  const seen = new Set(rows.map((row) => row.project_id).filter(Boolean))
  for (const project of ledProjects || []) {
    if (!project?.id || seen.has(project.id)) continue
    seen.add(project.id)
    const isManager = project.project_manager_user_id === internalUserId
    rows.push({
      id: null,
      project_id: project.id,
      projects: {
        project_name: project.project_name,
        project_code: project.project_code,
      },
      project_roles: {
        role_name: isManager ? 'project_manager' : 'project_owner',
        role_display_name: isManager ? 'Project Manager' : 'Project owner',
        role_level: null,
        permissions: [],
        is_governance_only: false,
      },
      is_active: true,
    })
  }
  return rows
}

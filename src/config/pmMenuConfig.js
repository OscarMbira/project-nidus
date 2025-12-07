/**
 * Platform Menu Configuration
 * Defines menu structure for Platform with permission requirements
 */

export const pmMenuConfig = [
  {
    id: 'pm-dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: 'layout-dashboard',
    permission: null, // Available to all
  },
  {
    id: 'pm-projects',
    label: 'Projects',
    path: '/app/projects',
    icon: 'folder-kanban',
    permission: 'project.view',
    children: [
      {
        id: 'pm-projects-my',
        label: 'My Projects',
        path: '/app/projects',
        permission: 'project.view',
      },
      {
        id: 'pm-projects-all',
        label: 'All Projects',
        path: '/app/projects/all',
        permission: 'project.view', // May need additional permission
      },
      {
        id: 'pm-projects-create',
        label: 'Create Project',
        path: '/app/projects/create',
        permission: 'project.create',
      },
    ],
  },
  {
    id: 'pm-tasks',
    label: 'Tasks',
    path: '/app/tasks',
    icon: 'list-checks',
    permission: 'task.view',
  },
  {
    id: 'pm-risks',
    label: 'Risks',
    path: '/app/risks',
    icon: 'alert-triangle',
    permission: 'risk.view',
  },
  {
    id: 'pm-documents',
    label: 'Documents',
    path: '/app/documents',
    icon: 'file-text',
    permission: 'document.view',
  },
  {
    id: 'pm-team',
    label: 'Team',
    path: null,
    icon: 'users',
    permission: 'user.view',
    children: [
      {
        id: 'pm-team-users',
        label: 'Project Users',
        path: '/app/projects/:projectId/users',
        permission: 'user.manage',
      },
      {
        id: 'pm-team-roles',
        label: 'Roles & Permissions',
        path: '/app/projects/:projectId/roles',
        permission: 'role.manage',
      },
    ],
  },
  {
    id: 'pm-account',
    label: 'Account',
    path: null,
    icon: 'briefcase',
    permission: null,
    children: [
      {
        id: 'pm-account-settings',
        label: 'Account Settings',
        path: '/app/account/:accountId/settings',
        permission: null, // Owner only - checked in component
      },
      {
        id: 'pm-account-subscription',
        label: 'Subscription',
        path: '/app/account/:accountId/subscription',
        permission: 'billing.view',
      },
      {
        id: 'pm-account-seats',
        label: 'Seat Management',
        path: '/app/account/:accountId/seats',
        permission: 'billing.purchase_seats',
      },
    ],
  },
  {
    id: 'pm-reports',
    label: 'Reports',
    path: '/app/reports',
    icon: 'chart-bar',
    permission: 'report.view',
  },
  {
    id: 'pm-settings',
    label: 'Settings',
    path: '/app/settings',
    icon: 'settings',
    permission: 'settings.view',
  },
]

/**
 * Check if menu item should be visible based on permissions
 * @param {object} menuItem - Menu item configuration
 * @param {array} userPermissions - User's permissions for current project
 * @returns {boolean}
 */
export function isMenuItemVisible(menuItem, userPermissions = []) {
  // If no permission required, always visible
  if (!menuItem.permission) {
    return true
  }

  // Check if user has required permission
  return userPermissions.includes(menuItem.permission)
}

/**
 * Filter menu items based on permissions
 * @param {array} menuItems - Menu items to filter
 * @param {array} userPermissions - User's permissions
 * @returns {array} Filtered menu items
 */
export function filterMenuByPermissions(menuItems, userPermissions = []) {
  return menuItems
    .filter((item) => isMenuItemVisible(item, userPermissions))
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: filterMenuByPermissions(item.children, userPermissions),
        }
      }
      return item
    })
    .filter((item) => !item.children || item.children.length > 0) // Remove items with no visible children
}

export default pmMenuConfig


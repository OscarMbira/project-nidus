/**
 * Role Assignment Page
 * 
 * Allows PMO Admin to assign roles and invite users
 * with specific roles to the organisation
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Users, 
  Shield, 
  CheckCircle, 
  X, 
  Loader,
  AlertCircle,
  Briefcase,
  UserCheck,
  Send,
  Search
} from 'lucide-react';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';
import ViewToggle from '@nidus/ui/ViewToggle';
import ExportListMenu from '@nidus/ui/ExportListMenu';
import RowNumberBadge from '@nidus/ui/RowNumberBadge';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import { supabase } from '../../services/supabaseClient';
import {
  getAssignableRoles,
  isPmoAdmin as checkIsPmoAdmin,
  assignRoleToUser,
  inviteUserWithRole,
  getOrganisationUsers,
  removeRoleFromUser
} from '../../services/organisationRoleService';
import { getUserSystemRoles } from '../../services/roleService';
import Button from '@nidus/ui/Button';
import Card from '@nidus/ui/Card';

const EXPORT_COLUMNS = [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'roles', label: 'Roles' },
];

const DEFAULT_SORT = { column: 'full_name', direction: 'asc' };

const SORT_ACCESSORS = {
  full_name: (u) => u.full_name || '',
  email: (u) => u.email || '',
  roles: (u) => u.roles.map((r) => r.role_display_name).join(', '),
};

export default function RoleAssignment() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useViewMode('role-assignment-users', 'list');
  const [search, setSearch] = useState('');
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: DEFAULT_SORT,
    storageKey: 'nidus-role-assignment-users',
  });
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Role assignment state
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [organisationUsers, setOrganisationUsers] = useState([]);
  const [hasPmoAdminAccess, setHasPmoAdminAccess] = useState(false);
  
  // Invitation form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  
  // Assignment form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('');

  const checkAccessAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is PMO Admin
      const adminCheck = await checkIsPmoAdmin(user.id);
      if (!adminCheck) {
        setError('Only PMO Admin can access this page');
        setLoading(false);
        return;
      }

      setHasPmoAdminAccess(true);
      
      // Load assignable roles
      const rolesResult = await getAssignableRoles();
      if (rolesResult.success) {
        setAssignableRoles(rolesResult.data);
      }

      // Load organisation users
      await loadOrganisationUsers(user.id);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganisationUsers = async (authUserId) => {
    try {
      const result = await getOrganisationUsers(authUserId);
      if (result.success) {
        setOrganisationUsers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error loading organisation users:', err);
    }
  };

  useEffect(() => {
    checkAccessAndLoadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAssigning(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!inviteEmail || !inviteRole) {
        setError('Email and role are required');
        setAssigning(false);
        return;
      }

      const result = await inviteUserWithRole(
        inviteEmail,
        inviteRole,
        user.id,
        inviteMessage || null
      );

      if (result.success) {
        setSuccess(`Invitation sent to ${inviteEmail} for role ${inviteRole}`);
        setInviteEmail('');
        setInviteRole('');
        setInviteMessage('');
        setShowInviteForm(false);
        // Reload users
        await loadOrganisationUsers(user.id);
      } else {
        setError(result.error || 'Failed to send invitation');
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      setError(err.message || 'Failed to invite user');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAssigning(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!assignUserId || !assignRole) {
        setError('User and role are required');
        setAssigning(false);
        return;
      }

      // Get user's auth_user_id from internal user ID
      const { data: targetUser } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('id', assignUserId)
        .single();

      if (!targetUser) {
        setError('User not found');
        setAssigning(false);
        return;
      }

      const result = await assignRoleToUser(
        targetUser.auth_user_id,
        assignRole,
        user.id
      );

      if (result.success) {
        setSuccess(`Role ${assignRole} assigned successfully`);
        setAssignUserId('');
        setAssignRole('');
        setShowAssignForm(false);
        // Reload users
        await loadOrganisationUsers(user.id);
      } else {
        setError(result.error || 'Failed to assign role');
      }
    } catch (err) {
      console.error('Error assigning role:', err);
      setError(err.message || 'Failed to assign role');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveRole = async (userId, roleName) => {
    if (!confirm(`Are you sure you want to remove the ${roleName} role from this user?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setAssigning(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's auth_user_id
      const { data: targetUser } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('id', userId)
        .single();

      if (!targetUser) {
        setError('User not found');
        setAssigning(false);
        return;
      }

      const result = await removeRoleFromUser(
        targetUser.auth_user_id,
        roleName,
        user.id
      );

      if (result.success) {
        setSuccess(`Role ${roleName} removed successfully`);
        // Reload users
        await loadOrganisationUsers(user.id);
      } else {
        setError(result.error || 'Failed to remove role');
      }
    } catch (err) {
      console.error('Error removing role:', err);
      setError(err.message || 'Failed to remove role');
    } finally {
      setAssigning(false);
    }
  };

  const getRoleIcon = (roleName) => {
    const iconMap = {
      'programme_manager': Briefcase,
      'project_manager': Briefcase,
      'project_board_member': Shield,
      'project_assurance': CheckCircle,
      'quality_assurance': CheckCircle,
    };
    return iconMap[roleName] || UserCheck;
  };

  const displayUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? organisationUsers.filter((u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.roles.some((r) => r.role_display_name?.toLowerCase().includes(q))
        )
      : organisationUsers;
    // Default order: name A→Z, then email (no created date on these rows)
    const byNameThenEmail = [...filtered].sort((a, b) =>
      String(a.full_name || '').localeCompare(String(b.full_name || ''), undefined, { sensitivity: 'base' }) ||
      String(a.email || '').localeCompare(String(b.email || ''), undefined, { sensitivity: 'base' })
    );
    return sortedData(byNameThenEmail, SORT_ACCESSORS);
  }, [organisationUsers, search, sortedData]);

  const exportData = useMemo(
    () =>
      displayUsers.map((u) => ({
        full_name: u.full_name || '',
        email: u.email || '',
        roles: u.roles.map((r) => r.role_display_name).join('\n'),
      })),
    [displayUsers]
  );

  const renderRoleChips = (user) => (
    <div className="flex flex-wrap gap-2">
      {user.roles.map(role => {
        const RoleIcon = getRoleIcon(role.role_name);
        return (
          <div
            key={role.id}
            className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <RoleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {role.role_display_name}
            </span>
            <button
              onClick={() => handleRemoveRole(user.id, role.role_name)}
              className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              title="Remove role"
              aria-label={`Remove ${role.role_display_name} role`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPmoAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <Button onClick={() => navigate('/simulator/pmo/dashboard')}>Go to Dashboard</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Role Assignment & Invitations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Assign roles to existing users or invite new users with specific roles
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <p className="text-green-800 dark:text-green-200">{success}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-4">
          <Button
            onClick={() => {
              setShowInviteForm(!showInviteForm);
              setShowAssignForm(false);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Invite New User
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowAssignForm(!showAssignForm);
              setShowInviteForm(false);
            }}
            className="flex items-center gap-2"
          >
            <UserCheck className="h-5 w-5" />
            Assign Role to Existing User
          </Button>
        </div>

        {/* Invite User Form */}
        {showInviteForm && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Invite New User</h2>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a role</option>
                  {assignableRoles.map(role => (
                    <option key={role.id} value={role.role_name}>
                      {role.role_display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Add a personal message to the invitation..."
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={assigning} className="flex items-center gap-2">
                  {assigning ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail('');
                    setInviteRole('');
                    setInviteMessage('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Assign Role Form */}
        {showAssignForm && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Assign Role to Existing User</h2>
            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  User *
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a user</option>
                  {organisationUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email} {user.roles.length > 0 && `(${user.roles.map(r => r.role_display_name).join(', ')})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role *
                </label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a role</option>
                  {assignableRoles.map(role => (
                    <option key={role.id} value={role.role_name}>
                      {role.role_display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={assigning} className="flex items-center gap-2">
                  {assigning ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-5 w-5" />
                      Assign Role
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAssignForm(false);
                    setAssignUserId('');
                    setAssignRole('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Organisation Users List */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Organisation Users</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {displayUsers.length} user{displayUsers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users or roles..."
                  className="pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <ExportListMenu
                columns={EXPORT_COLUMNS}
                data={exportData}
                baseFilename="Organisation-Users"
                disabled={!displayUsers.length}
              />
              <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Organisation users layout" />
            </div>
          </div>

          {displayUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {organisationUsers.length === 0 ? (
                <>
                  <p className="text-gray-600 dark:text-gray-400">No users found in your organisation</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Invite users to get started
                  </p>
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No users match your search</p>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <TableRowNumberHeader />
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('full_name')} onSort={() => handleSort('full_name')}>Name</TableHeaderCell>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('email')} onSort={() => handleSort('email')}>Email</TableHeaderCell>
                    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('roles')} onSort={() => handleSort('roles')}>Roles</TableHeaderCell>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {displayUsers.map((user, index) => (
                    <tr key={user.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">{user.full_name || 'No name'}</td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{user.email}</td>
                      <td className="px-3 py-3">
                        {user.roles.length > 0 ? renderRoleChips(user) : (
                          <span className="text-gray-700 dark:text-gray-200">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <RowNumberBadge number={getDisplayRowNumber(index)} />
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.full_name || 'No name'}
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{user.email}</p>
                    </div>
                  </div>
                  {user.roles.length > 0 && <div className="mt-3">{renderRoleChips(user)}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


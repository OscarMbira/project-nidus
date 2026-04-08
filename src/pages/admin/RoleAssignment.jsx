/**
 * Role Assignment Page
 * 
 * Allows PMO Admin to assign roles and invite users
 * with specific roles to the organisation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Users, 
  Mail, 
  Shield, 
  CheckCircle, 
  X, 
  Loader,
  AlertCircle,
  Briefcase,
  UserCheck,
  Send
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { 
  getAssignableRoles, 
  isPmoAdmin, 
  assignRoleToUser, 
  inviteUserWithRole,
  getOrganisationUsers,
  removeRoleFromUser
} from '../../services/organisationRoleService';
import { getUserSystemRoles } from '../../services/roleService';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PlatformHeader from '../../components/homepage/PlatformHeader';

export default function RoleAssignment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Role assignment state
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [organisationUsers, setOrganisationUsers] = useState([]);
  const [isPmoAdmin, setIsPmoAdmin] = useState(false);
  
  // Invitation form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  
  // Assignment form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('');

  useEffect(() => {
    checkAccessAndLoadData();
  }, []);

  const checkAccessAndLoadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is PMO Admin
      const adminCheck = await isPmoAdmin(user.id);
      if (!adminCheck) {
        setError('Only PMO Admin can access this page');
        setLoading(false);
        return;
      }

      setIsPmoAdmin(true);
      
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PlatformHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isPmoAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PlatformHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <Button onClick={() => navigate('/platform/dashboard')}>Go to Dashboard</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PlatformHeader />
      
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Organisation Users</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {organisationUsers.length} user{organisationUsers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {organisationUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No users found in your organisation</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Invite users to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {organisationUsers.map(user => (
                <div
                  key={user.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {user.full_name || 'No name'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>

                      {user.roles.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
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
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


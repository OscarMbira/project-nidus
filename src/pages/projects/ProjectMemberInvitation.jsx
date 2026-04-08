/**
 * Project Member Invitation Page
 * 
 * Allows Project Managers to invite Team Managers & Project Members to their projects
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { 
  UserPlus, 
  Mail, 
  Users, 
  CheckCircle, 
  X, 
  Loader,
  AlertCircle,
  Send,
  Briefcase
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { isProjectManager, getProjectManagerAssignableRoles } from '../../services/projectRoleAssignmentService';
import { inviteUserToProject, getProjectInvitations, getProjectMembers } from '../../services/projectMembershipService';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PlatformHeader from '../../components/homepage/PlatformHeader';

export default function ProjectMemberInvitation() {
  const navigate = useNavigate();
  const { projectId, routeKey } = usePlatformProjectId();
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Project data
  const [project, setProject] = useState(null);
  const [isPM, setIsPM] = useState(false);
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  
  // Invitation form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .single();

      if (projectError || !projectData) {
        setError('Project not found');
        setLoading(false);
        return;
      }

      setProject(projectData);

      // Check if user is Project Manager
      const pmCheck = await isProjectManager(user.id, projectId);
      if (!pmCheck) {
        setError('Only Project Managers can invite team members');
        setLoading(false);
        return;
      }

      setIsPM(true);

      // Load assignable roles
      const rolesResult = await getProjectManagerAssignableRoles();
      if (rolesResult.success) {
        setAssignableRoles(rolesResult.data);
      }

      // Load project members
      await loadProjectMembers();

      // Load pending invitations
      await loadPendingInvitations();
    } catch (err) {
      console.error('Error loading project data:', err);
      setError(err.message || 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectMembers = async () => {
    try {
      const result = await getProjectMembers(projectId);
      if (result.success) {
        setProjectMembers(result.data);
      }
    } catch (err) {
      console.error('Error loading project members:', err);
    }
  };

  const loadPendingInvitations = async () => {
    try {
      const result = await getProjectInvitations(projectId, 'pending');
      if (result.success) {
        setPendingInvitations(result.data);
      }
    } catch (err) {
      console.error('Error loading invitations:', err);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setInviting(true);

    try {
      if (!inviteEmail || !inviteRoleId) {
        setError('Email and role are required');
        setInviting(false);
        return;
      }

      const result = await inviteUserToProject(projectId, {
        email: inviteEmail,
        roleId: inviteRoleId,
        message: inviteMessage || null
      });

      if (result.success) {
        setSuccess(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        setInviteRoleId('');
        setInviteMessage('');
        setShowInviteForm(false);
        // Reload invitations
        await loadPendingInvitations();
      } else {
        if (result.code === 'SEAT_LIMIT_EXCEEDED') {
          setError('No available seats. Please purchase additional seats to invite more members.');
        } else {
          setError(result.error || 'Failed to send invitation');
        }
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      setError(err.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
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

  if (!isPM) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PlatformHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <Button onClick={() => navigate(`/projects/${projectId}`)}>Back to Project</Button>
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
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            ← Back to Project
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Invite Team Members
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {project?.project_name} ({project?.project_code})
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

        {/* Invite Button */}
        <div className="mb-6">
          <Button
            onClick={() => {
              setShowInviteForm(!showInviteForm);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Invite New Member
          </Button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Invite Team Member</h2>
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
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a role</option>
                  {assignableRoles.map(role => (
                    <option key={role.id} value={role.id}>
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
                <Button type="submit" disabled={inviting} className="flex items-center gap-2">
                  {inviting ? (
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
                    setInviteRoleId('');
                    setInviteMessage('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {pendingInvitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invitation.invited_email}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {invitation.role?.role_display_name || invitation.role?.role_name}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Sent {new Date(invitation.invitation_sent_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Project Members */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Project Members</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {projectMembers.length} member{projectMembers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {projectMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No members yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Invite team members to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectMembers.map(member => (
                <div
                  key={member.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {member.user?.full_name || 'No name'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        {member.role?.role_display_name || member.role?.role_name}
                      </span>
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


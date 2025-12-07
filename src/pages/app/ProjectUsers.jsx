/**
 * Project Users Page
 * Manage project team members, invitations, and seat usage
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getProjectMembers, getProjectInvitations } from '../../services/projectMembershipService'
import { getProjectSeatAllocation } from '../../services/seatManagementService'
import InviteUserModal from '../../components/app/InviteUserModal'
import SeatUsageWidget from '../../components/app/SeatUsageWidget'
import { Users, UserPlus, Mail, MoreVertical, Edit, Trash2, Loader } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import PermissionGate from '../../components/auth/PermissionGate'

export default function ProjectUsers() {
  const { projectId } = useParams()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [seatAllocation, setSeatAllocation] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load members
      const membersResult = await getProjectMembers(projectId)
      if (membersResult.success) {
        setMembers(membersResult.data || [])
      }

      // Load invitations
      const invitationsResult = await getProjectInvitations(projectId, 'pending')
      if (invitationsResult.success) {
        setInvitations(invitationsResult.data || [])
      }

      // Load seat allocation
      const seatResult = await getProjectSeatAllocation(projectId)
      if (seatResult.success) {
        setSeatAllocation(seatResult.data)
      }
    } catch (error) {
      console.error('Error loading project users:', error)
      showToast('error', 'Failed to load project users')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteSuccess = () => {
    setShowInviteModal(false)
    loadData()
    showToast('success', 'Invitation sent successfully')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Users</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage team members and invitations
          </p>
        </div>
        <PermissionGate permission="user.invite" projectId={projectId}>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </button>
        </PermissionGate>
      </div>

      {/* Seat Usage Widget */}
      {seatAllocation && (
        <SeatUsageWidget
          projectId={projectId}
          seatAllocation={seatAllocation}
          onPurchase={() => setShowInviteModal(true)}
        />
      )}

      {/* Active Members */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Members ({members.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {members.length > 0 ? (
            members.map((member) => (
              <div key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {member.user?.full_name?.charAt(0) || member.user?.email?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.user?.full_name || member.user?.email || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {member.user?.email}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {member.role?.role_display_name || member.role?.role_name}
                    </p>
                  </div>
                </div>
                <PermissionGate permission="user.change_role" projectId={projectId}>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      <Edit className="h-4 w-4" />
                    </button>
                    <PermissionGate permission="user.remove" projectId={projectId}>
                      <button className="p-2 text-red-600 dark:text-red-400 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </PermissionGate>
                  </div>
                </PermissionGate>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              No team members yet
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Pending Invitations ({invitations.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {invitation.invited_email}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Role: {invitation.role?.role_display_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Sent {new Date(invitation.invitation_sent_at).toLocaleDateString()}
                  </p>
                </div>
                <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Resend
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          projectId={projectId}
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  )
}


/**
 * PID Team Structure Section Component
 * Displays and manages project team structure within the PID
 */

import { useState } from 'react'
import { Plus, Users, Edit2, Trash2 } from 'lucide-react'
import TeamMemberForm from './TeamMemberForm'
import TeamMemberCard from './TeamMemberCard'

export default function TeamStructureSection({
  pidId,
  projectId,
  teamMembers = [],
  onTeamChange,
  readOnly = false
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState(null)

  const handleAddClick = () => {
    setEditingMember(null)
    setShowForm(true)
  }

  const handleEditClick = (member) => {
    setEditingMember(member)
    setShowForm(true)
  }

  const handleSave = (member) => {
    if (editingMember) {
      const updated = teamMembers.map(m =>
        m.id === editingMember.id ? { ...m, ...member } : m
      )
      if (onTeamChange) onTeamChange(updated)
    } else {
      if (onTeamChange) onTeamChange([...teamMembers, member])
    }
    setShowForm(false)
    setEditingMember(null)
  }

  const handleDelete = (memberId) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      const filtered = teamMembers.filter(m => m.id !== memberId)
      if (onTeamChange) onTeamChange(filtered)
    }
  }

  // Group team members by role type
  const groupedMembers = {
    board: teamMembers.filter(m => m.role_type === 'board'),
    manager: teamMembers.filter(m => m.role_type === 'manager'),
    team: teamMembers.filter(m => m.role_type === 'team'),
    support: teamMembers.filter(m => m.role_type === 'support'),
    other: teamMembers.filter(m => !m.role_type || !['board', 'manager', 'team', 'support'].includes(m.role_type))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-5 w-5" />
          Project Management Team Structure
        </h3>
        {!readOnly && (
          <button
            onClick={handleAddClick}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Team Member
          </button>
        )}
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Users className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No team members defined yet</p>
          {!readOnly && (
            <button
              onClick={handleAddClick}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Add First Team Member
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project Board */}
          {groupedMembers.board.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Project Board
              </h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMembers.board.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    onEdit={() => handleEditClick(member)}
                    onDelete={() => handleDelete(member.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Project Manager */}
          {groupedMembers.manager.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Project Manager
              </h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMembers.manager.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    onEdit={() => handleEditClick(member)}
                    onDelete={() => handleDelete(member.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Team Members */}
          {groupedMembers.team.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Team Members
              </h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMembers.team.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    onEdit={() => handleEditClick(member)}
                    onDelete={() => handleDelete(member.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Support */}
          {groupedMembers.support.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Project Support
              </h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMembers.support.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    onEdit={() => handleEditClick(member)}
                    onDelete={() => handleDelete(member.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other */}
          {groupedMembers.other.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Other Roles
              </h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMembers.other.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    onEdit={() => handleEditClick(member)}
                    onDelete={() => handleDelete(member.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <TeamMemberForm
          pidId={pidId}
          projectId={projectId}
          member={editingMember}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingMember(null)
          }}
        />
      )}
    </div>
  )
}

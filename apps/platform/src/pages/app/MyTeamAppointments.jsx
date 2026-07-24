import { useCallback } from 'react'
import AppointmentLedgerView from '../../components/appointments/AppointmentLedgerView'
import { listMyTeamMemberAppointments } from '../../services/teamMemberAppointmentService'

export default function MyTeamAppointments() {
  const loadByStatus = useCallback(async (status) => {
    const res = await listMyTeamMemberAppointments()
    if (!res.success) return res
    const filtered = status
      ? (res.data || []).filter((r) => r.appointment_status === status)
      : res.data
    return { success: true, data: filtered }
  }, [])

  return (
    <AppointmentLedgerView
      title="My Team Assignments"
      description="Assignment records where you are the invited team member."
      pageId="my-team-appointments"
      exportBaseName="my_team_appointments"
      rowLabel="Project role"
      loadByStatus={loadByStatus}
      acceptPathBuilder={(r) =>
        r.invitation?.invitation_token ? `/auth/invitation/${r.invitation.invitation_token}` : null
      }
    />
  )
}

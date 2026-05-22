import { useCallback } from 'react'
import AppointmentLedgerView from '../../../components/appointments/AppointmentLedgerView'
import { getMyPendingSimTeamAppointments } from '../../../services/sim/simTeamMemberAppointmentService'

export default function SimMyTeamAppointments() {
  const loadByStatus = useCallback(async (status) => {
    if (status === 'pending_acceptance') {
      return getMyPendingSimTeamAppointments()
    }
    const pending = await getMyPendingSimTeamAppointments()
    const all = pending.data || []
    const filtered = status ? all.filter((r) => r.appointment_status === status) : all
    return { success: true, data: filtered }
  }, [])

  return (
    <AppointmentLedgerView
      title="My Simulator Assignments"
      description="Your practice team assignment records."
      pageId="sim-my-team-appointments"
      exportBaseName="sim_my_team_appointments"
      loadByStatus={loadByStatus}
    />
  )
}

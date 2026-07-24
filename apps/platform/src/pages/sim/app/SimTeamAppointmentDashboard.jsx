import AppointmentLedgerView from '../../../components/appointments/AppointmentLedgerView'
import { listSimTeamMemberAppointments } from '../../../services/sim/simTeamMemberAppointmentService'

export default function SimTeamAppointmentDashboard() {
  return (
    <AppointmentLedgerView
      title="Simulator — Team Appointments"
      description="Practice team member assignment records."
      pageId="sim-team-appointment-dashboard"
      exportBaseName="sim_team_appointments"
      rowLabel="Member"
      loadByStatus={(status) => listSimTeamMemberAppointments({ status })}
    />
  )
}

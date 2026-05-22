import AppointmentLedgerView from '../../components/appointments/AppointmentLedgerView'
import {
  listTeamMemberAppointments,
  remindTeamMemberAppointment,
  withdrawTeamMemberAppointment,
} from '../../services/teamMemberAppointmentService'

export default function TeamAppointmentDashboard() {
  return (
    <AppointmentLedgerView
      title="Team Appointments"
      description="Formal team member assignment records for your projects."
      pageId="team-appointment-dashboard"
      exportBaseName="team_member_appointments"
      rowLabel="Member"
      loadByStatus={(status) => listTeamMemberAppointments({ status })}
      onRemind={remindTeamMemberAppointment}
      onWithdraw={withdrawTeamMemberAppointment}
    />
  )
}

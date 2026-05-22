import AppointmentLedgerView from '../../components/appointments/AppointmentLedgerView'
import {
  listManagerAppointments,
  remindManagerAppointment,
  withdrawManagerAppointment,
} from '../../services/managerAppointmentService'

export default function AppointmentDashboard() {
  return (
    <AppointmentLedgerView
      title="Appointment Tracker"
      description="Formal manager appointments: pending acceptance, active, declined, and ended."
      pageId="pmo-appointment-tracker"
      exportBaseName="manager_appointments"
      rowLabel="Appointee"
      loadByStatus={(status) => listManagerAppointments({ status })}
      onRemind={remindManagerAppointment}
      onWithdraw={withdrawManagerAppointment}
    />
  )
}

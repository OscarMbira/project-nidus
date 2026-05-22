import AppointmentLedgerView from '../../../components/appointments/AppointmentLedgerView'
import { listSimManagerAppointments } from '../../../services/sim/simManagerAppointmentService'

export default function SimAppointmentDashboard() {
  return (
    <AppointmentLedgerView
      title="Simulator — Appointment Tracker"
      description="Practice manager appointments in the simulation environment."
      pageId="sim-pmo-appointment-tracker"
      exportBaseName="sim_manager_appointments"
      rowLabel="Appointee"
      loadByStatus={(status) => listSimManagerAppointments({ status })}
    />
  )
}

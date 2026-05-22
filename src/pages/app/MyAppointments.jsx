import { useCallback } from 'react'
import AppointmentLedgerView from '../../components/appointments/AppointmentLedgerView'
import { listMyManagerAppointments } from '../../services/managerAppointmentService'

export default function MyAppointments() {
  const loadByStatus = useCallback(async (status) => {
    const res = await listMyManagerAppointments()
    if (!res.success) return res
    const filtered = status
      ? (res.data || []).filter((r) => r.appointment_status === status)
      : res.data
    return { success: true, data: filtered }
  }, [])

  return (
    <AppointmentLedgerView
      title="My Appointments"
      description="Manager appointments where you are the appointee."
      pageId="my-manager-appointments"
      exportBaseName="my_manager_appointments"
      rowLabel="Entity"
      loadByStatus={loadByStatus}
      acceptPathBuilder={(r) =>
        r.invitation?.invitation_token ? `/auth/invitation/${r.invitation.invitation_token}` : null
      }
    />
  )
}

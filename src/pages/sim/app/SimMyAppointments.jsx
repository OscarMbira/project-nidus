import { useCallback } from 'react'
import AppointmentLedgerView from '../../../components/appointments/AppointmentLedgerView'
import { getMyPendingSimManagerAppointments, listSimManagerAppointments } from '../../../services/sim/simManagerAppointmentService'
import { simDb } from '../../../services/supabaseClient'

export default function SimMyAppointments() {
  const loadByStatus = useCallback(async (status) => {
    if (status === 'pending_acceptance') {
      return getMyPendingSimManagerAppointments()
    }
    const all = await listSimManagerAppointments({ status })
    if (!all.success) return all
    const { data: simUserId } = await simDb.rpc('get_current_user_id')
    const filtered = (all.data || []).filter((r) => r.appointee_user_id === simUserId)
    return { success: true, data: filtered }
  }, [])

  return (
    <AppointmentLedgerView
      title="My Simulator Appointments"
      description="Your practice manager appointment records."
      pageId="sim-my-appointments"
      exportBaseName="sim_my_appointments"
      loadByStatus={loadByStatus}
    />
  )
}

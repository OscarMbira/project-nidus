import InvitationTrackerView from '../../../components/invitations/InvitationTrackerView'
import * as simInvitationTrackerService from '../../../services/sim/simInvitationTrackerService'

export default function SimulatorPMInvitationTracker() {
  return (
    <InvitationTrackerView
      scope="pm"
      pageId="sim-pm-invitation-tracker"
      title="Invitation Status"
      service={simInvitationTrackerService}
    />
  )
}

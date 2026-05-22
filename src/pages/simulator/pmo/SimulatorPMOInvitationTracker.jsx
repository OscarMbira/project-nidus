import InvitationTrackerView from '../../../components/invitations/InvitationTrackerView'
import * as simInvitationTrackerService from '../../../services/sim/simInvitationTrackerService'

export default function SimulatorPMOInvitationTracker() {
  return (
    <InvitationTrackerView
      scope="pmo"
      pageId="sim-pmo-invitation-tracker"
      title="Invitation Tracker"
      service={simInvitationTrackerService}
    />
  )
}

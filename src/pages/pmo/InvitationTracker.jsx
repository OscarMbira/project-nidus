import InvitationTrackerView from '../../components/invitations/InvitationTrackerView'
import * as invitationTrackerService from '../../services/invitationTrackerService'

export default function PMOInvitationTracker() {
  return (
    <InvitationTrackerView
      scope="pmo"
      pageId="pmo-invitation-tracker"
      title="Invitation Tracker"
      service={invitationTrackerService}
    />
  )
}

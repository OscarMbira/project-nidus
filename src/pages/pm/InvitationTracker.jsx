import InvitationTrackerView from '../../components/invitations/InvitationTrackerView'
import * as invitationTrackerService from '../../services/invitationTrackerService'

export default function PMInvitationTracker() {
  return (
    <InvitationTrackerView
      scope="pm"
      pageId="pm-invitation-tracker"
      title="Invitation Status"
      service={invitationTrackerService}
    />
  )
}

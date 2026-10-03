import GovernanceMembersPanel from '../../components/governance/GovernanceMembersPanel'

export default function SteeringCommitteePage() {
  return (
    <GovernanceMembersPanel
      bodyType="steering_committee"
      title="Steering Committee"
      description="Steering Committee membership for this project."
      backTo="/platform/governance-structure"
    />
  )
}

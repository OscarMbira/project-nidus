import GovernanceMembersPanel from '../../components/governance/GovernanceMembersPanel'

export default function ProjectBoardPage() {
  return (
    <GovernanceMembersPanel
      bodyType="project_board"
      title="Project Board"
      description="Project Board membership for this project."
      backTo="/platform/governance/steering-committee"
    />
  )
}

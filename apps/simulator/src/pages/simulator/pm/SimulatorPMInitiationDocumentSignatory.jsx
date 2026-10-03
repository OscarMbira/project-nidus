/**
 * Simulator PM Initiation - Document Signatory (v1067)
 * Practice-project-locked signatory requirements editor for the project's owner, plus a
 * team-scope editor for anyone who leads a practice team on this project.
 */
import { ShieldCheck } from 'lucide-react'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import ProjectTeamSignatoryPanel from '../../../components/signatory/ProjectTeamSignatoryPanel'

export default function SimulatorPMInitiationDocumentSignatory() {
  const { projectId, loading } = usePlatformProjectId()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Document Signatory</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Configure who must sign each document type for this practice project, or for a team you lead.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : !projectId ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-700 dark:text-gray-300">Select a project</p>
          <p className="text-sm mt-1">Choose a practice project from the project picker to configure its Document Signatory requirements.</p>
        </div>
      ) : (
        <ProjectTeamSignatoryPanel practiceProjectId={projectId} />
      )}
    </div>
  )
}

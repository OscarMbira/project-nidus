/**
 * Team Structure Section
 * Section 7: Team organization
 */

import TeamStructureChart from './TeamStructureChart'

export default function TeamStructureSection({ formData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (e) => {
    onChange(e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          7. Team Structure
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Overview of team organization and structure
        </p>
      </div>

      {/* Team Structure Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Team Structure Description <span className="text-red-500">*</span>
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.team_structure_description || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              name="team_structure_description"
              value={formData.team_structure_description || ''}
              onChange={handleChange}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.team_structure_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Describe the team organization, reporting lines, and structure..."
              required
            />
            {errors.team_structure_description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.team_structure_description}</p>
            )}
          </>
        )}
      </div>

      {/* Team Structure Diagram URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Team Structure Diagram URL
        </label>
        {readOnly ? (
          formData.team_structure_diagram_url ? (
            <a
              href={formData.team_structure_diagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Diagram
            </a>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No diagram uploaded</p>
          )
        ) : (
          <input
            type="url"
            name="team_structure_diagram_url"
            value={formData.team_structure_diagram_url || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="URL to org chart image"
          />
        )}
      </div>

      {/* Team Structure Chart */}
      {formData.id && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <TeamStructureChart briefId={formData.id} readOnly={readOnly} />
        </div>
      )}
    </div>
  )
}

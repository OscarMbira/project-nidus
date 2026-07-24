/**
 * Stakeholders Section
 * Users and interested parties
 */

export default function StakeholdersSection({ formData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (e) => {
    onChange(e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Users and Interested Parties
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Identify all stakeholders who have an interest in the project
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Stakeholders
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.users_and_interested_parties || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="users_and_interested_parties"
            value={formData.users_and_interested_parties || ''}
            onChange={handleChange}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="List all users and interested parties, their roles, and their interest in the project..."
          />
        )}
      </div>
    </div>
  )
}

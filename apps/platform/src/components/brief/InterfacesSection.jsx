/**
 * Interfaces Section
 * Links to other projects/programmes/systems
 */

export default function InterfacesSection({ formData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (e) => {
    onChange(e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Interfaces
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Identify links to other projects, programmes, or systems
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Interfaces
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.interfaces || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="interfaces"
            value={formData.interfaces || ''}
            onChange={handleChange}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe links to other projects, programmes, systems, or external dependencies..."
          />
        )}
      </div>
    </div>
  )
}

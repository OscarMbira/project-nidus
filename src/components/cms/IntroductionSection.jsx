/**
 * CMS Introduction Section Component
 * Purpose, objectives, scope, responsibility
 */

export default function IntroductionSection({ cmsData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...cmsData, [field]: value })
    }
  }

  if (readOnly) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Purpose</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {cmsData?.purpose || 'Not specified'}
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Objectives</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {cmsData?.objectives || 'Not specified'}
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scope</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {cmsData?.scope || 'Not specified'}
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Strategy Responsibility</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {cmsData?.strategy_responsibility || 'Not specified'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Purpose <span className="text-red-500">*</span>
        </label>
        <textarea
          value={cmsData?.purpose || ''}
          onChange={(e) => handleChange('purpose', e.target.value)}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            errors.purpose ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Describe the purpose of this communication management strategy..."
          required
        />
        {errors.purpose && <p className="text-red-500 text-sm mt-1">{errors.purpose}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Objectives <span className="text-red-500">*</span>
        </label>
        <textarea
          value={cmsData?.objectives || ''}
          onChange={(e) => handleChange('objectives', e.target.value)}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            errors.objectives ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Define the communication objectives for this project..."
          required
        />
        {errors.objectives && <p className="text-red-500 text-sm mt-1">{errors.objectives}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Scope <span className="text-red-500">*</span>
        </label>
        <textarea
          value={cmsData?.scope || ''}
          onChange={(e) => handleChange('scope', e.target.value)}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            errors.scope ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Define the scope of communication management..."
          required
        />
        {errors.scope && <p className="text-red-500 text-sm mt-1">{errors.scope}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Strategy Responsibility
        </label>
        <textarea
          value={cmsData?.strategy_responsibility || ''}
          onChange={(e) => handleChange('strategy_responsibility', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Who is responsible for this strategy?"
        />
      </div>
    </div>
  )
}

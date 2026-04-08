import { Calendar } from 'lucide-react'

export default function NextPeriodSection({ formData, onChange, errors, mode }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Next Period Planning</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Plan products and quality activities for the next reporting period.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Products Planned for Development
        </label>
        <textarea
          value={formData.next_period_products_developing || ''}
          onChange={(e) => onChange('next_period_products_developing', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="List products planned for development in the next period..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Products Planned for Completion
        </label>
        <textarea
          value={formData.next_period_products_completing || ''}
          onChange={(e) => onChange('next_period_products_completing', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="List products planned for completion in the next period..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Activities Planned
        </label>
        <textarea
          value={formData.next_period_quality_activities || ''}
          onChange={(e) => onChange('next_period_quality_activities', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="List quality activities planned for the next period..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
    </div>
  )
}

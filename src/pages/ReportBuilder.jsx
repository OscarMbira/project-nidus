import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, Save, Play, Download, Plus, X, Filter, SortAsc, BarChart3, Table as TableIcon } from 'lucide-react'
import { TableRowNumberHeader, TableRowNumberCell } from '../components/ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'

export default function ReportBuilder() {
  const navigate = useNavigate()
  const [reportConfig, setReportConfig] = useState({
    template_name: '',
    template_description: '',
    template_category: 'custom',
    data_source_type: 'table',
    data_source_name: '',
    field_config: [],
    filter_config: [],
    grouping_config: [],
    sorting_config: [],
    visualization_config: {},
    page_size: 50,
    show_totals: false,
  })
  const [availableTables, setAvailableTables] = useState([])
  const [availableFields, setAvailableFields] = useState([])
  const [reportData, setReportData] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    fetchAvailableTables()
  }, [])

  useEffect(() => {
    if (reportConfig.data_source_name) {
      fetchAvailableFields()
    }
  }, [reportConfig.data_source_name, reportConfig.data_source_type])

  const fetchAvailableTables = async () => {
    try {
      const { data, error } = await supabase
        .from('database_tables')
        .select('table_name, table_description')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('table_name', { ascending: true })

      if (error) throw error
      setAvailableTables(data || [])
    } catch (error) {
      console.error('Error fetching tables:', error)
    }
  }

  const fetchAvailableFields = async () => {
    // In a real implementation, this would query the table structure
    // For now, we'll use a simplified approach
    setAvailableFields([
      { name: 'id', label: 'ID', type: 'uuid' },
      { name: 'created_at', label: 'Created At', type: 'timestamp' },
      { name: 'updated_at', label: 'Updated At', type: 'timestamp' },
    ])
  }

  const handleFieldToggle = (field) => {
    setReportConfig(prev => {
      const existingIndex = prev.field_config.findIndex(f => f.name === field.name)
      if (existingIndex >= 0) {
        // Remove field
        return {
          ...prev,
          field_config: prev.field_config.filter((_, i) => i !== existingIndex)
        }
      } else {
        // Add field
        return {
          ...prev,
          field_config: [
            ...prev.field_config,
            {
              name: field.name,
              label: field.label || field.name,
              type: field.type || 'text',
              visible: true,
              sortable: true,
            }
          ]
        }
      }
    })
  }

  const handleAddFilter = () => {
    setReportConfig(prev => ({
      ...prev,
      filter_config: [
        ...prev.filter_config,
        {
          field: '',
          operator: 'equals',
          value: '',
        }
      ]
    }))
  }

  const handleRemoveFilter = (index) => {
    setReportConfig(prev => ({
      ...prev,
      filter_config: prev.filter_config.filter((_, i) => i !== index)
    }))
  }

  const handleFilterChange = (index, field, value) => {
    setReportConfig(prev => ({
      ...prev,
      filter_config: prev.filter_config.map((filter, i) =>
        i === index ? { ...filter, [field]: value } : filter
      )
    }))
  }

  const handleAddSort = () => {
    setReportConfig(prev => ({
      ...prev,
      sorting_config: [
        ...prev.sorting_config,
        {
          field: '',
          direction: 'asc',
        }
      ]
    }))
  }

  const handleRemoveSort = (index) => {
    setReportConfig(prev => ({
      ...prev,
      sorting_config: prev.sorting_config.filter((_, i) => i !== index)
    }))
  }

  const handleSortChange = (index, field, value) => {
    setReportConfig(prev => ({
      ...prev,
      sorting_config: prev.sorting_config.map((sort, i) =>
        i === index ? { ...sort, [field]: value } : sort
      )
    }))
  }

  const handleRunReport = async () => {
    if (!reportConfig.data_source_name) {
      alert('Please select a data source')
      return
    }

    try {
      setLoading(true)
      setPreviewMode(true)

      // Build query based on configuration
      let query = supabase.from(reportConfig.data_source_name).select('*')

      // Apply filters
      reportConfig.filter_config.forEach(filter => {
        if (filter.field && filter.value) {
          switch (filter.operator) {
            case 'equals':
              query = query.eq(filter.field, filter.value)
              break
            case 'not_equals':
              query = query.neq(filter.field, filter.value)
              break
            case 'contains':
              query = query.ilike(filter.field, `%${filter.value}%`)
              break
            case 'greater_than':
              query = query.gt(filter.field, filter.value)
              break
            case 'less_than':
              query = query.lt(filter.field, filter.value)
              break
          }
        }
      })

      // Apply sorting
      reportConfig.sorting_config.forEach(sort => {
        if (sort.field) {
          query = query.order(sort.field, { ascending: sort.direction === 'asc' })
        }
      })

      // Apply limit
      query = query.limit(reportConfig.page_size || 50)

      const { data, error } = await query

      if (error) throw error
      setReportData(data || [])
    } catch (error) {
      console.error('Error running report:', error)
      alert('Error running report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!reportConfig.template_name) {
      alert('Please enter a template name')
      return
    }

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('report_templates')
        .insert({
          ...reportConfig,
          created_by: user.id,
        })

      if (error) throw error
      alert('Report template saved successfully!')
      navigate('/reports/templates')
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Error saving template: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/reports')}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Report Builder
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create custom reports with filters, sorting, and visualizations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={reportConfig.template_name}
                  onChange={(e) => setReportConfig({ ...reportConfig, template_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="My Custom Report"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={reportConfig.template_description}
                  onChange={(e) => setReportConfig({ ...reportConfig, template_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Data Source */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Data Source
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Source Type
                </label>
                <select
                  value={reportConfig.data_source_type}
                  onChange={(e) => setReportConfig({ ...reportConfig, data_source_type: e.target.value, data_source_name: '' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="table">Table</option>
                  <option value="query">Custom Query</option>
                  <option value="view">View</option>
                </select>
              </div>
              {reportConfig.data_source_type === 'table' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Table *
                  </label>
                  <select
                    value={reportConfig.data_source_name}
                    onChange={(e) => setReportConfig({ ...reportConfig, data_source_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select a table</option>
                    {availableTables.map(table => (
                      <option key={table.table_name} value={table.table_name}>
                        {table.table_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Fields Selection */}
          {reportConfig.data_source_name && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                Fields
              </h2>
              <div className="space-y-2">
                {availableFields.map(field => {
                  const isSelected = reportConfig.field_config.some(f => f.name === field.name)
                  return (
                    <label
                      key={field.name}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleFieldToggle(field)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {field.label || field.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({field.type})
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </h2>
              <button
                onClick={handleAddFilter}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Filter
              </button>
            </div>
            <div className="space-y-3">
              {reportConfig.filter_config.map((filter, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <select
                    value={filter.field}
                    onChange={(e) => handleFilterChange(index, 'field', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select field</option>
                    {availableFields.map(field => (
                      <option key={field.name} value={field.name}>
                        {field.label || field.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filter.operator}
                    onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                  </select>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={() => handleRemoveFilter(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {reportConfig.filter_config.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No filters added. Click "Add Filter" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Sorting */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <SortAsc className="h-5 w-5" />
                Sorting
              </h2>
              <button
                onClick={handleAddSort}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Sort
              </button>
            </div>
            <div className="space-y-3">
              {reportConfig.sorting_config.map((sort, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <select
                    value={sort.field}
                    onChange={(e) => handleSortChange(index, 'field', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select field</option>
                    {availableFields.map(field => (
                      <option key={field.name} value={field.name}>
                        {field.label || field.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sort.direction}
                    onChange={(e) => handleSortChange(index, 'direction', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                  <button
                    onClick={() => handleRemoveSort(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {reportConfig.sorting_config.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No sorting added. Click "Add Sort" to add one.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={handleRunReport}
                disabled={loading || !reportConfig.data_source_name}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {loading ? 'Running...' : 'Run Report'}
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving || !reportConfig.template_name}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>

            {/* Display Settings */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Display Settings
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Page Size
                  </label>
                  <input
                    type="number"
                    value={reportConfig.page_size}
                    onChange={(e) => setReportConfig({ ...reportConfig, page_size: parseInt(e.target.value) || 50 })}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reportConfig.show_totals}
                    onChange={(e) => setReportConfig({ ...reportConfig, show_totals: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Totals</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Results */}
      {previewMode && reportData.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preview Results ({reportData.length} rows)
            </h2>
            <button
              onClick={() => setPreviewMode(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  {reportConfig.field_config.filter(f => f.visible).map(field => (
                    <th
                      key={field.name}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reportData.map((row, index) => (
                  <tr key={index}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    {reportConfig.field_config.filter(f => f.visible).map(field => (
                      <td
                        key={field.name}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                      >
                        {row[field.name] !== null && row[field.name] !== undefined
                          ? String(row[field.name])
                          : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


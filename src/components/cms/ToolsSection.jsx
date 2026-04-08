/**
 * Tools Section Component
 * Communication tools and technologies list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getTools, addTool, updateTool, deleteTool } from '../../services/cmsToolsTechnologiesService'
import ToolCard from './ToolCard'
import ToolForm from './ToolForm'

export default function ToolsSection({ cmsId, readOnly = false }) {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    tool_name: '',
    tool_type: '',
    tool_description: '',
    tool_purpose: '',
    applicable_to: '',
    proficiency_required: 'basic',
    license_required: false,
    license_info: '',
    cost: null,
    external_link: ''
  })

  useEffect(() => {
    if (cmsId) {
      loadTools()
    }
  }, [cmsId])

  const loadTools = async () => {
    try {
      setLoading(true)
      const data = await getTools(cmsId)
      setTools(data || [])
    } catch (error) {
      console.error('Error loading tools:', error)
      alert('Error loading tools: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateTool(editingId, formData)
      } else {
        await addTool(cmsId, formData)
      }
      await loadTools()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (error) {
      console.error('Error saving tool:', error)
      alert('Error saving tool: ' + error.message)
    }
  }

  const handleEdit = (tool) => {
    setFormData({
      tool_name: tool.tool_name || '',
      tool_type: tool.tool_type || '',
      tool_description: tool.tool_description || '',
      tool_purpose: tool.tool_purpose || '',
      applicable_to: tool.applicable_to || '',
      proficiency_required: tool.proficiency_required || 'basic',
      license_required: tool.license_required || false,
      license_info: tool.license_info || '',
      cost: tool.cost || null,
      external_link: tool.external_link || ''
    })
    setEditingId(tool.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tool?')) return
    try {
      await deleteTool(id)
      await loadTools()
    } catch (error) {
      console.error('Error deleting tool:', error)
      alert('Error deleting tool: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      tool_name: '',
      tool_type: '',
      tool_description: '',
      tool_purpose: '',
      applicable_to: '',
      proficiency_required: 'basic',
      license_required: false,
      license_info: '',
      cost: null,
      external_link: ''
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  if (!cmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the CMS first before adding tools
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Communication Tools and Technologies
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define the tools and technologies used for communication
          </p>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Tool
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <ToolForm
          toolData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!editingId}
        />
      )}

      {/* Tools List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading tools...</div>
      ) : tools.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No tools and technologies defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onEdit={handleEdit}
              onDelete={handleDelete}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Product Description Distribution Component
 */

import { useState, useEffect } from 'react'
import { Mail, User, Plus, Send } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { getProductDescriptionById } from '../../services/productDescriptionService'

export default function ProductDescriptionDistribution({ pdId }) {
  const [distributions, setDistributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [formData, setFormData] = useState({
    recipient_id: '',
    recipient_name: '',
    recipient_title: '',
    date_of_issue: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (pdId) {
      loadDistributions()
      loadTeamMembers()
    }
  }, [pdId])

  const loadDistributions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pd_distribution')
        .select(`
          *,
          recipient:recipient_id(id, full_name, email)
        `)
        .eq('product_description_id', pdId)
        .order('date_of_issue', { ascending: false })

      if (error) throw error
      setDistributions(data || [])
    } catch (error) {
      console.error('Error loading distributions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async () => {
    try {
      const { data: pd } = await getProductDescriptionById(pdId)
      if (!pd.success || !pd.data) return

      const { data: members } = await supabase
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(id, full_name, email)
        `)
        .eq('project_id', pd.data.project_id)
        .eq('is_deleted', false)
      setTeamMembers((members || []).map(m => m.user).filter(Boolean))
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const handleAddDistribution = async (e) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('User not authenticated')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      const { data: pd } = await getProductDescriptionById(pdId)
      if (!pd.success) {
        alert('Product Description not found')
        return
      }

      const { error } = await supabase
        .from('pd_distribution')
        .insert({
          product_description_id: pdId,
          recipient_id: formData.recipient_id || null,
          recipient_name: formData.recipient_name,
          recipient_title: formData.recipient_title || null,
          date_of_issue: formData.date_of_issue,
          version_distributed: pd.data.version_number || '1.0',
          created_by: userData.id
        })

      if (error) throw error

      setFormData({
        recipient_id: '',
        recipient_name: '',
        recipient_title: '',
        date_of_issue: new Date().toISOString().split('T')[0]
      })
      setShowAddForm(false)
      loadDistributions()
    } catch (error) {
      console.error('Error adding distribution:', error)
      alert('Error adding distribution: ' + error.message)
    }
  }

  const handleSendEmail = async (distribution) => {
    // Email sending would be implemented here
    // For now, just show a message
    alert(`Email distribution feature will send Product Description to ${distribution.recipient_name || distribution.recipient?.full_name || 'recipient'}`)
  }

  if (loading) {
    return <div className="text-center py-4">Loading distribution list...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Distribution List
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Distribution
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleAddDistribution} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recipient (Team Member)
                </label>
                <select
                  value={formData.recipient_id}
                  onChange={(e) => {
                    const member = teamMembers.find(m => m.id === e.target.value)
                    setFormData({
                      ...formData,
                      recipient_id: e.target.value,
                      recipient_name: member?.full_name || '',
                      recipient_title: member?.title || ''
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select team member</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or Enter Recipient Name
                </label>
                <input
                  type="text"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Recipient name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recipient Title
                </label>
                <input
                  type="text"
                  value={formData.recipient_title}
                  onChange={(e) => setFormData({ ...formData, recipient_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Recipient title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Issue
                </label>
                <input
                  type="date"
                  value={formData.date_of_issue}
                  onChange={(e) => setFormData({ ...formData, date_of_issue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({
                    recipient_id: '',
                    recipient_name: '',
                    recipient_title: '',
                    date_of_issue: new Date().toISOString().split('T')[0]
                  })
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Add Distribution
              </button>
            </div>
          </form>
        </div>
      )}

      {distributions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No distributions recorded yet
        </div>
      ) : (
        <div className="space-y-2">
          {distributions.map(dist => (
            <div
              key={dist.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {dist.recipient_name || dist.recipient?.full_name || 'Unknown'}
                  </p>
                  {dist.recipient_title && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {dist.recipient_title}
                    </p>
                  )}
                  {dist.recipient?.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {dist.recipient.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                  <p>{new Date(dist.date_of_issue).toLocaleDateString()}</p>
                  <p className="text-xs">v{dist.version_distributed}</p>
                </div>
                {dist.recipient?.email && (
                  <button
                    onClick={() => handleSendEmail(dist)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                    title="Send email"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


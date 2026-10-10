import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '../../../services/supabaseClient'
import { format } from 'date-fns'
import ReportSectionList from './ReportSectionList'

function showDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, 'dd MMM yyyy')
}

const DISTRIBUTION_COLUMNS = [
  { key: 'recipient', label: 'Recipient', value: (row) => row.recipient_name || row.recipient?.full_name || row.recipient?.email || '' },
  { key: 'status', label: 'Status', value: (row) => String(row.distribution_status || '').replace(/_/g, ' ') },
  { key: 'issued', label: 'Issued', value: (row) => showDate(row.date_of_issue) },
]

export default function EPRDistribution({ reportId, mode = 'view' }) {
  const [distribution, setDistribution] = useState([])
  const [users, setUsers] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    if (reportId) {
      loadDistribution()
      loadUsers()
    }
  }, [reportId])

  const loadDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from('end_project_report_distribution')
        .select(`
          *,
          recipient:recipient_id(id, full_name, email)
        `)
        .eq('end_project_report_id', reportId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDistribution(data || [])
    } catch (error) {
      console.error('Error loading distribution:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleAdd = async () => {
    if (!selectedUserId) return

    try {
      const { data: user } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', selectedUserId)
        .single()

      const { error } = await supabase
        .from('end_project_report_distribution')
        .insert({
          end_project_report_id: reportId,
          recipient_id: selectedUserId,
          recipient_name: user.full_name || user.email,
          date_of_issue: new Date().toISOString().split('T')[0],
          distribution_status: 'sent'
        })

      if (error) throw error
      await loadDistribution()
      setSelectedUserId('')
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding distribution:', error)
      alert('Error adding distribution: ' + error.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <ReportSectionList
          viewModeId="epr-distribution"
          title="Distribution List"
          rows={distribution}
          columns={DISTRIBUTION_COLUMNS}
          emptyText="No distribution list."
        />
      </div>

      {mode !== 'view' && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Add Recipient
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select user...</option>
                    {users.filter(user => !distribution.some(d => d.recipient_id === user.id)).map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                    Add
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Users className="h-5 w-5" />
              Add Recipient
            </button>
          )}
        </>
      )}
    </div>
  )
}

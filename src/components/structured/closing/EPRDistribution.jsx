import { useState, useEffect } from 'react'
import { Users, Mail, CheckCircle, Eye } from 'lucide-react'
import { supabase } from '../../../services/supabaseClient'
import { format } from 'date-fns'

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'acknowledged':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'read':
        return <Eye className="h-4 w-4 text-blue-500" />
      default:
        return <Mail className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Distribution List
        </h3>
      </div>

      {distribution.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No distribution list</p>
        </div>
      ) : (
        <div className="space-y-3">
          {distribution.map((item) => (
            <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(item.distribution_status)}
                    <h4 className="font-semibold text-gray-900 dark:text-white">{item.recipient_name}</h4>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {item.distribution_status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Issued: {item.date_of_issue && format(new Date(item.date_of_issue), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

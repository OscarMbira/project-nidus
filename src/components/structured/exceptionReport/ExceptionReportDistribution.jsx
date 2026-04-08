import { useState, useEffect } from 'react'
import { Mail, User, Calendar, CheckCircle, Eye, Clock } from 'lucide-react'
import { supabase } from '../../../services/supabaseClient'
import { format } from 'date-fns'

export default function ExceptionReportDistribution({ reportId }) {
  const [distribution, setDistribution] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reportId) {
      loadDistribution()
    }
  }, [reportId])

  const loadDistribution = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('exception_report_distribution')
        .select(`
          *,
          recipient:recipient_id (id, full_name, email)
        `)
        .eq('exception_report_id', reportId)
        .order('date_of_issue', { ascending: false })

      if (error) throw error
      setDistribution(data || [])
    } catch (error) {
      console.error('Error loading distribution:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'acknowledged':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'read':
        return <Eye className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'acknowledged':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'read':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      default:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Loading distribution list...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Distribution List
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Recipients who have received this exception report.
        </p>
      </div>

      {distribution.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No distribution records</p>
        </div>
      ) : (
        <div className="space-y-3">
          {distribution.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {item.recipient_name || item.recipient?.full_name || item.recipient?.email || 'Unknown'}
                    </h4>
                    {item.recipient_title && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({item.recipient_title})
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${getStatusColor(item.distribution_status)}`}>
                      {getStatusIcon(item.distribution_status)}
                      {item.distribution_status}
                    </span>
                  </div>
                  {item.date_of_issue && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <Calendar className="h-4 w-4" />
                      Issued: {format(new Date(item.date_of_issue), 'MMM dd, yyyy')}
                    </div>
                  )}
                  {item.version_distributed && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Version: {item.version_distributed}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

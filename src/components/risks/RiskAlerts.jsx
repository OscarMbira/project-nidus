/**
 * Risk Alerts Component
 * Display alerts for high risks, overdue responses, proximity warnings
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, TrendingUp, X } from 'lucide-react'
import { getRisksByProject } from '../../services/riskService'
import { getPendingResponses, getOverdueResponses } from '../../services/riskResponseService'
import { useNavigate } from 'react-router-dom'

export default function RiskAlerts({ projectId }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (projectId) {
      loadAlerts()
    }
  }, [projectId])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const alertsList = []

      // Get high/very high risks
      const risksResult = await getRisksByProject(projectId, {
        risk_level: 'high'
      })
      if (risksResult.success && risksResult.data) {
        const highRisks = risksResult.data.filter(r => {
          const score = r.pre_risk_score || r.risk_level || ''
          return score.includes('high') || score.includes('critical')
        })
        
        if (highRisks.length > 0) {
          alertsList.push({
            id: 'high-risks',
            type: 'warning',
            title: `${highRisks.length} High/Very High Risk${highRisks.length > 1 ? 's' : ''}`,
            message: `${highRisks.length} risk${highRisks.length > 1 ? 's have' : ' has'} a high or very high risk score and may require immediate attention.`,
            action: 'View Risks',
            onClick: () => navigate(`/app/projects/${projectId}/risks`),
            icon: AlertTriangle,
            risks: highRisks
          })
        }
      }

      // Get risks without response plans
      const risksWithoutResponses = risksResult.data?.filter(r => {
        const score = r.pre_risk_score || r.risk_level || ''
        const hasHighScore = score.includes('high') || score.includes('critical')
        const isActive = !['closed', 'expired', 'occurred'].includes(r.status_enum || r.status || '')
        return hasHighScore && isActive
      }) || []

      if (risksWithoutResponses.length > 0) {
        alertsList.push({
          id: 'no-responses',
          type: 'error',
          title: `${risksWithoutResponses.length} High Risk${risksWithoutResponses.length > 1 ? 's' : ''} Without Response Plan`,
          message: `${risksWithoutResponses.length} high risk${risksWithoutResponses.length > 1 ? 's lack' : ' lacks'} a response plan.`,
          action: 'Add Responses',
          onClick: () => navigate(`/app/projects/${projectId}/risks`),
          icon: AlertTriangle,
          risks: risksWithoutResponses
        })
      }

      // Get overdue response actions
      const overdueResult = await getOverdueResponses(projectId)
      if (overdueResult.success && overdueResult.data && overdueResult.data.length > 0) {
        alertsList.push({
          id: 'overdue-responses',
          type: 'error',
          title: `${overdueResult.data.length} Overdue Response Action${overdueResult.data.length > 1 ? 's' : ''}`,
          message: `${overdueResult.data.length} response action${overdueResult.data.length > 1 ? 's are' : ' is'} past their target date.`,
          action: 'View Responses',
          onClick: () => navigate(`/app/projects/${projectId}/risks`),
          icon: Clock,
          responses: overdueResult.data
        })
      }

      // Get risks approaching proximity date (within 7 days)
      const risksResult2 = await getRisksByProject(projectId)
      if (risksResult2.success && risksResult2.data) {
        const today = new Date()
        const sevenDaysFromNow = new Date(today)
        sevenDaysFromNow.setDate(today.getDate() + 7)
        
        const imminentRisks = risksResult2.data.filter(r => {
          if (!r.proximity_date) return false
          const proximityDate = new Date(r.proximity_date)
          const isActive = !['closed', 'expired', 'occurred'].includes(r.status_enum || r.status || '')
          return isActive && proximityDate >= today && proximityDate <= sevenDaysFromNow
        })

        if (imminentRisks.length > 0) {
          alertsList.push({
            id: 'imminent-risks',
            type: 'warning',
            title: `${imminentRisks.length} Risk${imminentRisks.length > 1 ? 's' : ''} Approaching Proximity Date`,
            message: `${imminentRisks.length} risk${imminentRisks.length > 1 ? 's are' : ' is'} approaching its proximity date within the next 7 days.`,
            action: 'Review Risks',
            onClick: () => navigate(`/app/projects/${projectId}/risks`),
            icon: Clock,
            risks: imminentRisks
          })
        }
      }

      setAlerts(alertsList)
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || alerts.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert) => {
        const Icon = alert.icon || AlertTriangle
        const bgColor = alert.type === 'error' 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        const iconColor = alert.type === 'error'
          ? 'text-red-600 dark:text-red-400'
          : 'text-yellow-600 dark:text-yellow-400'

        return (
          <div
            key={alert.id}
            className={`${bgColor} rounded-lg border p-4 flex items-start gap-3`}
          >
            <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {alert.title}
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {alert.message}
              </p>
              {alert.onClick && (
                <button
                  onClick={alert.onClick}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {alert.action} →
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

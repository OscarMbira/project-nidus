/**
 * Risk Alerts Component
 * Display alerts for high risks, overdue responses, proximity warnings
 */

import { useMemo } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { isActiveRisk, summariseProjectRisks } from '../../utils/riskRegisterStats'

export default function RiskAlerts({ projectId, risks = [], overdueCount = 0 }) {
  const navigate = useNavigate()
  const alerts = useMemo(() => {
    const stats = summariseProjectRisks(risks)
    const alertsList = []
    const openRisks = () => navigate(`/app/projects/${projectId}/risks`)

    if (stats.high > 0) {
      alertsList.push({
        id: 'high-risks',
        type: 'warning',
        title: `${stats.high} High/Very High Risk${stats.high > 1 ? 's' : ''}`,
        message: `${stats.high} risk${stats.high > 1 ? 's have' : ' has'} a high or very high risk score and may require immediate attention.`,
        action: 'View Risks',
        onClick: openRisks,
        icon: AlertTriangle,
      })
    }

    const missingPlan = stats.withoutResponsePlan.length
    if (missingPlan > 0) {
      alertsList.push({
        id: 'no-responses',
        type: 'error',
        title: `${missingPlan} High Risk${missingPlan > 1 ? 's' : ''} Without Response Plan`,
        message: `${missingPlan} high risk${missingPlan > 1 ? 's lack' : ' lacks'} a response plan.`,
        action: 'Add Responses',
        onClick: openRisks,
        icon: AlertTriangle,
      })
    }

    if (overdueCount > 0) {
      alertsList.push({
        id: 'overdue-responses',
        type: 'error',
        title: `${overdueCount} Overdue Response Action${overdueCount > 1 ? 's' : ''}`,
        message: `${overdueCount} response action${overdueCount > 1 ? 's are' : ' is'} past their target date.`,
        action: 'View Responses',
        onClick: openRisks,
        icon: Clock,
      })
    }

    const today = new Date()
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(today.getDate() + 7)
    const imminentCount = (Array.isArray(risks) ? risks : []).filter((risk) => {
      if (!risk?.proximity_date || !isActiveRisk(risk)) return false
      const proximityDate = new Date(risk.proximity_date)
      return proximityDate >= today && proximityDate <= sevenDaysFromNow
    }).length
    if (imminentCount > 0) {
      alertsList.push({
        id: 'imminent-risks',
        type: 'warning',
        title: `${imminentCount} Risk${imminentCount > 1 ? 's' : ''} Approaching Proximity Date`,
        message: `${imminentCount} risk${imminentCount > 1 ? 's are' : ' is'} approaching its proximity date within the next 7 days.`,
        action: 'Review Risks',
        onClick: openRisks,
        icon: Clock,
      })
    }

    return alertsList
  }, [risks, overdueCount, projectId, navigate])

  if (alerts.length === 0) {
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

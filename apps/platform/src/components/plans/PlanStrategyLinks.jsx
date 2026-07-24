/**
 * Plan Strategy Links Component
 * Shows links to management strategies
 */

import { Shield, Award, Settings, MessageSquare, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STRATEGY_ICONS = {
  quality_management_strategy_id: Award,
  risk_management_strategy_id: Shield,
  configuration_management_strategy_id: Settings,
  communication_management_strategy_id: MessageSquare
}

const STRATEGY_LABELS = {
  quality_management_strategy_id: 'Quality Management Strategy',
  risk_management_strategy_id: 'Risk Management Strategy',
  configuration_management_strategy_id: 'Configuration Management Strategy',
  communication_management_strategy_id: 'Communication Management Strategy'
}

const STRATEGY_ROUTES = {
  quality_management_strategy_id: 'qms',
  risk_management_strategy_id: 'rms',
  configuration_management_strategy_id: 'configuration-ms',
  communication_management_strategy_id: 'cms'
}

export default function PlanStrategyLinks({ plan, projectId }) {
  const navigate = useNavigate()

  const links = Object.keys(STRATEGY_LABELS)
    .filter(key => plan[key])
    .map(key => {
      const Icon = STRATEGY_ICONS[key]
      const reference = plan[key.replace('_id', '')]?.qms_reference || 
                       plan[key.replace('_id', '')]?.rms_reference ||
                       plan[key.replace('_id', '')]?.cms_reference ||
                       'N/A'
      
      return {
        id: key,
        label: STRATEGY_LABELS[key],
        reference,
        icon: Icon,
        route: STRATEGY_ROUTES[key],
        onClick: () => navigate(`/app/projects/${projectId}/${STRATEGY_ROUTES[key]}`)
      }
    })

  if (links.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No strategy links configured
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {links.map(link => {
        const Icon = link.icon
        return (
          <button
            key={link.id}
            onClick={link.onClick}
            className="flex items-center justify-between w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <div className="flex items-center">
              <Icon className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {link.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {link.reference}
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </button>
        )
      })}
    </div>
  )
}

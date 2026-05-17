/**
 * Risk Card Component
 * Display individual risk in card format
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformRiskPath } from '../../utils/projectRouteParam';
import { Calendar, User, Tag, Package, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import RiskTypeBadge from './RiskTypeBadge';
import RiskStatusBadge from './RiskStatusBadge';
import RiskScoreBadge from './RiskScoreBadge';
import ProximityBadge from './ProximityBadge';

export default function RiskCard({ risk, onEdit, onDelete, onEscalate }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const handleViewDetails = () => {
    const pSeg =
      (risk.project?.project_code && String(risk.project.project_code).trim()) ||
      risk.project_id;
    const rSeg = (risk.risk_code && String(risk.risk_code).trim()) || risk.id;
    navigate(platformRiskPath(pSeg, rSeg));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
              {risk.risk_identifier || risk.risk_code || `#${risk.risk_number || ''}`}
            </span>
            <RiskTypeBadge riskType={risk.risk_type} />
            <RiskScoreBadge score={risk.pre_risk_score || risk.risk_level} expectedValue={risk.pre_expected_value || risk.risk_score} />
            {risk.proximity && (
              <ProximityBadge proximity={risk.proximity} proximityDate={risk.proximity_date} />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {risk.risk_title}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {risk.identified_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(risk.identified_date).toLocaleDateString()}
              </span>
            )}
            {risk.risk_owner?.full_name && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {risk.risk_owner.full_name}
              </span>
            )}
            {risk.risk_category && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                {risk.risk_category}
              </span>
            )}
          </div>
        </div>
        <RiskStatusBadge status={risk.status_enum || risk.status} />
      </div>

      {/* Preview */}
      <div className="mb-3">
        {risk.event_description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {risk.event_description}
          </p>
        )}
        {!risk.event_description && risk.risk_description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {risk.risk_description}
          </p>
        )}
        {expanded && (
          <div className="mt-3 space-y-2 text-sm">
            {risk.cause_description && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Cause: </span>
                <span className="text-gray-600 dark:text-gray-400">{risk.cause_description}</span>
              </div>
            )}
            {risk.effect_description && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Effect: </span>
                <span className="text-gray-600 dark:text-gray-400">{risk.effect_description}</span>
              </div>
            )}
            {risk.response_strategy_description && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Response: </span>
                <span className="text-gray-600 dark:text-gray-400">{risk.response_strategy_description}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pre/Post Assessment */}
      <div className="grid grid-cols-2 gap-3 mb-3 p-2 bg-gray-50 dark:bg-gray-900 rounded">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Pre-Response</span>
          <div className="text-sm font-medium">
            P:{risk.pre_probability || risk.probability} × I:{risk.pre_impact || risk.impact} = {risk.pre_expected_value || risk.risk_score}
          </div>
        </div>
        {risk.post_probability && risk.post_impact && (
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Post-Response</span>
            <div className="text-sm font-medium">
              P:{risk.post_probability} × I:{risk.post_impact} = {risk.post_expected_value}
            </div>
          </div>
        )}
      </div>

      {/* Tags and Metadata */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {risk.tags && risk.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400" />
            {risk.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                {tag}
              </span>
            ))}
            {risk.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{risk.tags.length - 3} more</span>
            )}
          </div>
        )}
        {risk.related_product_name && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Package className="w-4 h-4" />
            {risk.related_product_name}
          </span>
        )}
      </div>

      {/* Stats and Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {risk.response_category && (
            <span className="text-xs">
              Response: {risk.response_category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
          <button
            onClick={handleViewDetails}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            View Details
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(risk)}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

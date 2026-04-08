/**
 * Lesson Card Component
 * Display individual lesson in card format
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Tag, Package, AlertTriangle, Star, Eye, CheckCircle } from 'lucide-react';
import LessonTypeBadge from './LessonTypeBadge';
import LessonStatusBadge from './LessonStatusBadge';
import EffectTypeIndicator from './EffectTypeIndicator';

export default function LessonCard({ lesson, onEdit, onDelete, onPromote }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const handleViewDetails = () => {
    navigate(`/app/projects/${lesson.project_id}/lessons/${lesson.id}`);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
              {lesson.lesson_reference || `#${lesson.lesson_number || ''}`}
            </span>
            <LessonTypeBadge scope={lesson.lesson_scope || 'project'} />
            <EffectTypeIndicator effectType={lesson.effect_type} />
            {lesson.priority && (
              <span className={`text-xs font-semibold ${getPriorityColor(lesson.priority)}`}>
                {lesson.priority.toUpperCase()}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {lesson.lesson_title}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {lesson.lesson_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(lesson.lesson_date).toLocaleDateString()}
              </span>
            )}
            {lesson.created_by_user?.full_name && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {lesson.created_by_user.full_name}
              </span>
            )}
            {lesson.lesson_category && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                {lesson.lesson_category}
              </span>
            )}
          </div>
        </div>
        <LessonStatusBadge status={lesson.status} />
      </div>

      {/* Preview */}
      <div className="mb-3">
        {lesson.what_happened && (
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {lesson.what_happened}
          </p>
        )}
        {expanded && (
          <div className="mt-3 space-y-2 text-sm">
            {lesson.impact_description && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Effect: </span>
                <span className="text-gray-600 dark:text-gray-400">{lesson.impact_description}</span>
              </div>
            )}
            {lesson.recommendations && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Recommendation: </span>
                <span className="text-gray-600 dark:text-gray-400">{lesson.recommendations}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tags and Metadata */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {lesson.tags && lesson.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400" />
            {lesson.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                {tag}
              </span>
            ))}
            {lesson.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{lesson.tags.length - 3} more</span>
            )}
          </div>
        )}
        {lesson.related_product_name && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Package className="w-4 h-4" />
            {lesson.related_product_name}
          </span>
        )}
        {lesson.was_identified_risk && (
          <span className="flex items-center gap-1 text-xs text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            Was Risk
          </span>
        )}
      </div>

      {/* Stats and Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {lesson.is_corporate_lesson && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              Corporate
            </span>
          )}
          {lesson.status === 'action_taken' && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Action Taken
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
              onClick={() => onEdit(lesson)}
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

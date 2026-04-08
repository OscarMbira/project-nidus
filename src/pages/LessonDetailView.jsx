/**
 * Lesson Detail View Page
 * Full detail view for a lesson
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft, Edit2, Trash2, Building2, Star } from 'lucide-react';
import { getLessonById, updateLesson, deleteLesson } from '../services/lessonService';
import { promoteToCorporate } from '../services/corporateLessonsService';
import LessonTypeBadge from '../components/lessonsLog/LessonTypeBadge';
import LessonStatusBadge from '../components/lessonsLog/LessonStatusBadge';
import EffectTypeIndicator from '../components/lessonsLog/EffectTypeIndicator';
import LessonCommentsSection from '../components/lessonsLog/LessonCommentsSection';
import LessonAttachments from '../components/lessonsLog/LessonAttachments';
import LessonActionsPanel from '../components/lessonsLog/LessonActionsPanel';
import LinkToRiskWidget from '../components/lessonsLog/LinkToRiskWidget';
import CreateRiskFromLessonWidget from '../components/lessonsLog/CreateRiskFromLessonWidget';
import LessonCompletenessIndicator from '../components/lessonsLog/LessonCompletenessIndicator';
import ExportRecordButtons from '../components/ui/ExportRecordButtons';
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils';

const LESSON_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'lesson_reference', label: 'Reference' },
    { key: 'lesson_title', label: 'Title' },
    { key: 'lesson_category', label: 'Category' },
    { key: 'effect_type', label: 'Effect Type' },
    { key: 'status', label: 'Status' },
    { key: 'lesson_scope', label: 'Scope' },
    { key: 'priority', label: 'Priority' }
  ]},
  { title: 'Description', fields: [
    { key: 'lesson_description', label: 'Description' },
    { key: 'recommendations', label: 'Recommendations' },
    { key: 'actions_taken', label: 'Actions Taken' }
  ]}
];

export default function LessonDetailView() {
  const { lessonId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (lessonId) {
      fetchLesson();
    }
  }, [lessonId]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const result = await getLessonById(lessonId);
      if (result.success) {
        setLesson(result.data);
      } else {
        alert('Error loading lesson: ' + result.error);
        navigate(`/app/projects/${projectId}/lessons`);
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
      alert('Error loading lesson: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!confirm('Promote this lesson to the corporate repository?')) return;

    try {
      const result = await promoteToCorporate(lessonId, {});
      if (result.success) {
        alert('Lesson promoted to corporate repository successfully!');
        fetchLesson();
      } else {
        alert('Error promoting lesson: ' + result.error);
      }
    } catch (error) {
      console.error('Error promoting lesson:', error);
      alert('Error promoting lesson: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete lesson "${lesson.lesson_title}"?`)) return;

    try {
      const result = await deleteLesson(lessonId);
      if (result.success) {
        navigate(`/app/projects/${projectId}/lessons`);
      } else {
        alert('Error deleting lesson: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Error deleting lesson: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lesson not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-gray-500">
                {lesson.lesson_reference || `#${lesson.lesson_number || ''}`}
              </span>
              <LessonTypeBadge scope={lesson.lesson_scope || 'project'} />
              <EffectTypeIndicator effectType={lesson.effect_type} />
              <LessonStatusBadge status={lesson.status} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {lesson.lesson_title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(LESSON_EXPORT_SECTIONS, lesson, `Lesson_${lesson.lesson_reference || lesson.id}`)}
            onExportWord={() => exportRecordToWord(LESSON_EXPORT_SECTIONS, lesson, `Lesson_${lesson.lesson_reference || lesson.id}`)}
            onExportExcel={() => exportRecordToExcel(LESSON_EXPORT_SECTIONS, lesson, `Lesson_${lesson.lesson_reference || lesson.id}`)}
            onExportCSV={() => exportRecordToCSV(LESSON_EXPORT_SECTIONS, lesson, `Lesson_${lesson.lesson_reference || lesson.id}`)}
            onExportXML={() => exportRecordToXML(LESSON_EXPORT_SECTIONS, lesson, `Lesson_${lesson.lesson_reference || lesson.id}`)}
            onExportJSON={() => exportRecordToJSON(LESSON_EXPORT_SECTIONS, lesson, `Lesson_${lesson.lesson_reference || lesson.id}`)}
            onExportPrint={() => exportRecordToPrint(LESSON_EXPORT_SECTIONS, lesson, `Lesson_${lesson.lesson_reference || lesson.id}`)}
          />
          {!lesson.is_corporate_lesson && (
            <button
              onClick={handlePromote}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Promote to Corporate
            </button>
          )}
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons/${lessonId}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* What Happened */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              What Happened
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {lesson.what_happened || lesson.event_description || 'No description provided'}
            </p>
          </div>

          {/* Effect */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Effect
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {lesson.impact_description || 'No effect description provided'}
            </p>
          </div>

          {/* Root Cause */}
          {lesson.why_it_happened && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Root Cause
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {lesson.why_it_happened}
              </p>
            </div>
          )}

          {/* Early Warning Indicators */}
          {lesson.early_warning_indicators && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Early Warning Indicators
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {lesson.early_warning_indicators}
              </p>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Recommendations
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {lesson.recommendations || 'No recommendations provided'}
            </p>
          </div>

          {/* Actions */}
          <LessonActionsPanel lessonId={lessonId} />

          {/* Comments */}
          <LessonCommentsSection lessonId={lessonId} />

          {/* Attachments */}
          <LessonAttachments lessonId={lessonId} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Completeness Indicator */}
          <LessonCompletenessIndicator lesson={lesson} showWarnings={true} />

          {/* Risk Integration */}
          {lesson.was_identified_risk && (
            <LinkToRiskWidget lesson={lesson} projectId={projectId} />
          )}
          
          <CreateRiskFromLessonWidget lesson={lesson} projectId={projectId} />

          {/* Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Details
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Category:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {lesson.lesson_category || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Priority:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                  {lesson.priority || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {lesson.lesson_date ? new Date(lesson.lesson_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {lesson.related_product_name && (
                <div>
                  <span className="text-gray-500">Product:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {lesson.related_product_name}
                  </span>
                </div>
              )}
              {lesson.created_by_user && (
                <div>
                  <span className="text-gray-500">Created by:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {lesson.created_by_user.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {lesson.tags && lesson.tags.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {lesson.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Risk Integration */}
          {lesson.was_identified_risk && (
            <LinkToRiskWidget lesson={lesson} projectId={projectId} />
          )}
          
          <CreateRiskFromLessonWidget lesson={lesson} projectId={projectId} />
        </div>
      </div>
    </div>
  );
}

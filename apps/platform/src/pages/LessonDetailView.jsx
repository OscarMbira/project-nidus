/**
 * Lesson Detail View Page
 * Full detail view for a lesson
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { ArrowLeft, Building2, Star } from 'lucide-react';
import { RowActionButton } from '@nidus/ui';
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
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons';
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '@nidus/shared/utils/exportUtils';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils';

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
  const { projectId, routeKey, loading: projectRouteLoading } = usePlatformProjectId();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (lessonId && projectId) {
      fetchLesson();
    } else if (!projectRouteLoading && !projectId) {
      // Avoid an infinite spinner when the project route param cannot be resolved
      setLoading(false);
    }
  }, [lessonId, projectId, projectRouteLoading]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const result = await getLessonById(lessonId, projectId);
      if (result.success) {
        setLesson(result.data);
        // Self-correct a raw-UUID bookmark to the friendly reference, same pattern as v872.
        if (result.data?.lesson_reference && result.data.lesson_reference !== lessonId) {
          navigate(platformProjectPath(routeKey, 'lessons', result.data.lesson_reference), { replace: true });
        }
      } else {
        alert('Error loading lesson: ' + result.error);
        navigate(platformProjectPath(routeKey, 'lessons'));
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
      const result = await promoteToCorporate(lesson.id, {});
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
      const result = await deleteLesson(lesson.id);
      if (result.success) {
        navigate(platformProjectPath(routeKey, 'lessons'));
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
            type="button"
            onClick={() => navigate(platformProjectPath(routeKey, 'lessons'))}
            className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Back to Lessons Log"
          >
            <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden />
            Back to Lessons Log
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
          <RowActionButton
            variant="edit"
            label="Edit lesson"
            onClick={() => navigate(platformProjectPath(routeKey, 'lessons', lesson.lesson_reference || lessonId, 'edit'))}
          />
          <RowActionButton variant="delete" label="Delete lesson" onClick={handleDelete} />
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who logged or changed this lesson, and how it is classified.">
          <AuditCard title="Identity" description="How this lesson is labelled and tracked.">
            <AuditField label="Reference" value={lesson.lesson_reference} />
            <AuditField label="Title" value={lesson.lesson_title} />
            <AuditField label="Status" value={humanizeAuditToken(lesson.status)} />
          </AuditCard>
          <AuditCard title="Classification" description="How this lesson is categorised.">
            <AuditField label="Category" value={humanizeAuditToken(lesson.lesson_category)} />
            <AuditField label="Scope" value={humanizeAuditToken(lesson.lesson_scope)} />
            <AuditField label="Priority" value={humanizeAuditToken(lesson.priority)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this lesson was created and last changed.">
            <AuditField label="Created by" value={lesson.created_by_user?.full_name || lesson.created_by_user?.email} />
            <AuditTimestampPair dateLabel="Created at" value={lesson.created_at} />
            <AuditField label="Updated by" value={lesson.updated_by_user?.full_name || lesson.updated_by_user?.email} />
            <AuditTimestampPair dateLabel="Last updated" value={lesson.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
      <>
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
      </>
      )}
    </div>
  );
}

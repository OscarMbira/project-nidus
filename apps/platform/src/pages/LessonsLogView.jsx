/**
 * Lessons Log View Page
 * Main page for viewing and managing lessons log
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useInitialFilterFromQuery } from '@nidus/shared/hooks/useInitialFilterFromQuery'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { Lightbulb, Plus, Download, FileText } from 'lucide-react';
import { exportToPDF, exportToCSV } from '@nidus/shared/utils/lessonExport';
import { getLessonsLogByProject } from '../services/lessonsLogService';
import ExportListMenu from '@nidus/ui/ExportListMenu';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import ViewToggle from '@nidus/ui/ViewToggle';
import { DashboardRegisterTabBar, DashboardStatCard } from '@nidus/ui';

const LESSON_COLUMNS = [
  { key: 'lesson_reference', label: 'Reference' },
  { key: 'lesson_title', label: 'Title' },
  { key: 'lesson_category', label: 'Category' },
  { key: 'effect_type', label: 'Effect Type' },
  { key: 'status', label: 'Status' },
  { key: 'lesson_scope', label: 'Scope' },
  { key: 'priority', label: 'Priority' }
];
import { getLessonsByProject, deleteLesson } from '../services/lessonService';
import { getLessonsSummary } from '../services/lessonService';
import { getRelevantCorporateLessons } from '../services/corporateLessonsService';
import LessonsList from '../components/lessonsLog/LessonsList';
import LessonsFilters from '../components/lessonsLog/LessonsFilters';
import LessonsReportsWidget from '../components/lessonsReport/LessonsReportsWidget';
import { RegisterOpenItemsWidget } from '@nidus/ui';

export default function LessonsLogView() {
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useViewMode('pm-lessons-log', 'list');
  const [pageTab, setPageTab] = useState('dashboard'); // 'dashboard' | 'register'
  const [log, setLog] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [summary, setSummary] = useState(null);
  const [corporateLessons, setCorporateLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    lesson_category: '',
    effect_type: '',
    status: '',
    lesson_scope: '',
    priority: '',
    is_corporate_lesson: undefined
  });
  const [quickFilter, setQuickFilter] = useState(''); // '' | 'actions_pending' | 'high_priority'

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchLessons();
    }
  }, [projectId, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logResult, summaryResult, corporateResult] = await Promise.all([
        getLessonsLogByProject(projectId),
        getLessonsSummary(projectId),
        getRelevantCorporateLessons(projectId)
      ]);

      if (logResult.success) {
        setLog(logResult.data);
      }

      if (summaryResult.success) {
        setSummary(summaryResult.data);
      }

      if (corporateResult.success) {
        setCorporateLessons(corporateResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching lessons log data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const result = await getLessonsByProject(projectId, filters);
      if (result.success) {
        setLessons(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  const handleAdd = () => {
    navigate(platformProjectPath(routeKey, 'lessons', 'create'));
  };

  const handleEdit = (lesson) => {
    navigate(platformProjectPath(routeKey, 'lessons', lesson.lesson_reference || lesson.id, 'edit'));
  };

  const handleDelete = async (lesson) => {
    if (!confirm(`Delete lesson "${lesson.lesson_title}"?`)) return;

    try {
      const result = await deleteLesson(lesson.id);
      if (result.success) {
        fetchLessons();
        fetchData();
      } else {
        alert('Error deleting lesson: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Error deleting lesson: ' + error.message);
    }
  };

  const handleViewDetails = (lesson) => {
    navigate(platformProjectPath(routeKey, 'lessons', lesson.lesson_reference || lesson.id));
  };

  const dashboardStats = useMemo(() => {
    const effect = (t) => String(t || '').toLowerCase()
    const status = (s) => String(s || '').toLowerCase()
    const priority = (p) => String(p || '').toLowerCase()
    return {
      total: lessons.length,
      positive: lessons.filter((l) => effect(l.effect_type) === 'positive').length,
      negative: lessons.filter((l) => effect(l.effect_type) === 'negative').length,
      neutral: lessons.filter((l) => {
        const e = effect(l.effect_type)
        return e === 'neutral' || e === 'mixed' || !e
      }).length,
      actionsPending: lessons.filter((l) => {
        const s = status(l.status)
        return s === 'identified' || s === 'open' || s === 'in_progress' || s === 'draft' || s === 'pending'
      }).length,
      highPriority: lessons.filter((l) => {
        const p = priority(l.priority)
        return p === 'high' || p === 'critical'
      }).length,
    }
  }, [lessons])

  const registerLessons = useMemo(() => {
    if (quickFilter === 'actions_pending') {
      return lessons.filter((l) => ['identified', 'open', 'in_progress', 'draft', 'pending'].includes(String(l.status || '').toLowerCase()))
    }
    if (quickFilter === 'high_priority') {
      return lessons.filter((l) => ['high', 'critical'].includes(String(l.priority || '').toLowerCase()))
    }
    return lessons
  }, [lessons, quickFilter])

  const showRegisterFiltered = (kind) => {
    const isEffect = kind === 'positive' || kind === 'negative' || kind === 'neutral'
    setFilters({
      search: '',
      lesson_category: '',
      effect_type: isEffect ? kind : '',
      status: '',
      lesson_scope: '',
      priority: '',
      is_corporate_lesson: undefined,
    })
    setQuickFilter(kind === 'actions_pending' || kind === 'high_priority' ? kind : '')
    setPageTab('register')
  }

  const initialQueryFilter = useInitialFilterFromQuery(['filter'])
  useEffect(() => {
    if (initialQueryFilter.filter) showRegisterFiltered(initialQueryFilter.filter === 'all' ? '' : initialQueryFilter.filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryFilter.filter])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-6 h-6" />
              Lessons Log
            </h1>
            {log && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Reference: {log.log_reference} • Version: {log.version_number || '1.0'}
              </p>
            )}
          </div>
          <DashboardRegisterTabBar
            value={pageTab}
            onChange={setPageTab}
            registerLabel="Log"
            ariaLabel="Lessons Log sections"
          />
        </div>
        {pageTab === 'register' && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Lessons log layout" />
            <ExportListMenu columns={LESSON_COLUMNS} data={registerLessons} baseFilename="LessonsLog" disabled={!registerLessons?.length} />
            {log && (
              <>
                <button
                  onClick={() => navigate(platformProjectPath(routeKey, 'lessons', 'reports'))}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Reports
                </button>
                <button
                  onClick={() => navigate(platformProjectPath(routeKey, 'lessons', 'reports', 'create'))}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Create Report
                </button>
                <button
                  onClick={() => navigate(platformProjectPath(routeKey, 'lessons', 'report'))}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Quick Report
                </button>
              </>
            )}
            {log && (
              <div className="relative group">
                <button
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => exportToPDF(log, lessons, summary)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Export as PDF
                  </button>
                  <button
                    onClick={() => exportToCSV(lessons)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Export as CSV
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Lesson
            </button>
          </div>
        )}
      </div>

      {pageTab === 'dashboard' && (
        <div className="space-y-6" role="tabpanel" aria-label="Lessons dashboard">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total lessons', value: dashboardStats.total, accent: 'text-gray-900 dark:text-white', kind: '' },
              { label: 'Positive', value: dashboardStats.positive, accent: 'text-emerald-700 dark:text-emerald-300', kind: 'positive' },
              { label: 'Negative', value: dashboardStats.negative, accent: 'text-red-700 dark:text-red-300', kind: 'negative' },
              { label: 'Neutral / other', value: dashboardStats.neutral, accent: 'text-gray-700 dark:text-gray-200', kind: 'neutral' },
              { label: 'Actions pending', value: dashboardStats.actionsPending, accent: 'text-amber-700 dark:text-amber-300', kind: 'actions_pending' },
              { label: 'High priority', value: dashboardStats.highPriority, accent: 'text-orange-700 dark:text-orange-300', kind: 'high_priority' },
            ].map((card) => (
              <DashboardStatCard
                key={card.label}
                label={card.label}
                value={card.value}
                accentClassName={card.accent}
                onClick={() => showRegisterFiltered(card.kind)}
              />
            ))}
          </div>

          {lessons.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No lessons in this project yet. Open the Log tab to add one.
            </p>
          )}

          {projectId && (
            <div>
              <LessonsReportsWidget projectId={projectId} routeKey={routeKey} lessonsLogId={log?.id} />
            </div>
          )}

          <RegisterOpenItemsWidget
            title="Lessons With Actions Pending"
            icon={Lightbulb}
            rows={lessons
              .filter((l) => ['identified', 'open', 'in_progress', 'draft', 'pending'].includes(String(l.status || '').toLowerCase()))
              .slice(0, 5)}
            totalCount={dashboardStats.actionsPending}
            columns={[
              { key: 'lesson_reference', label: 'Reference', className: 'font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap' },
              { key: 'lesson_title', label: 'Title', className: 'font-medium text-gray-900 dark:text-white' },
              { key: 'effect_type', label: 'Effect', className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap capitalize' },
              { key: 'lesson_date', label: 'Date', render: (l) => (l.lesson_date ? new Date(l.lesson_date).toLocaleDateString() : '—'), className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap' },
            ]}
            rowKey={(l) => l.id}
            searchFields={['lesson_title', 'lesson_reference']}
            onRowClick={handleViewDetails}
            onViewAll={() => setPageTab('register')}
            viewAllLabel="Open full Lessons Log"
            emptyMessage="No lessons with pending actions"
          />

          {corporateLessons.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Relevant Corporate Lessons ({corporateLessons.length})
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                Lessons from other projects that may be relevant to this project
              </p>
              <div className="space-y-2">
                {corporateLessons.slice(0, 3).map((lesson) => (
                  <div key={lesson.lesson_id} className="bg-white dark:bg-gray-800 rounded p-2 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">{lesson.title}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-1">{lesson.recommendations}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {pageTab === 'register' && (
        <div className="space-y-6" role="tabpanel" aria-label="Lessons log">
          <LessonsFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClear={() => setFilters({
              search: '',
              lesson_category: '',
              effect_type: '',
              status: '',
              lesson_scope: '',
              priority: '',
              is_corporate_lesson: undefined
            })}
          />

          {quickFilter && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {quickFilter === 'actions_pending' ? 'Actions pending only' : 'High priority only'}
              </span>
              <button type="button" onClick={() => setQuickFilter('')} className="text-blue-600 dark:text-blue-400 hover:underline">
                Clear
              </button>
            </div>
          )}

          <LessonsList
            lessons={registerLessons}
            loading={false}
            onView={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPromote={() => {}}
            emptyMessage="No lessons found. Click 'Add Lesson' to get started."
            viewMode={viewMode}
          />
        </div>
      )}
    </div>
  );
}

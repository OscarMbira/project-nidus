/**
 * Lessons Log View Page
 * Main page for viewing and managing lessons log
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { Lightbulb, Plus, Download, Settings, FileText } from 'lucide-react';
import { exportToPDF, exportToCSV } from '../utils/lessonExport';
import { getLessonsLogByProject, updateLessonsLog } from '../services/lessonsLogService';
import ExportListMenu from '../components/ui/ExportListMenu';

const LESSON_COLUMNS = [
  { key: 'lesson_reference', label: 'Reference' },
  { key: 'lesson_title', label: 'Title' },
  { key: 'lesson_category', label: 'Category' },
  { key: 'effect_type', label: 'Effect Type' },
  { key: 'status', label: 'Status' },
  { key: 'lesson_scope', label: 'Scope' },
  { key: 'priority', label: 'Priority' }
];
import { getLessonsByProject, createLesson, updateLesson, deleteLesson } from '../services/lessonService';
import { getLessonsSummary } from '../services/lessonService';
import { getRelevantCorporateLessons } from '../services/corporateLessonsService';
import LessonForm from '../components/lessonsLog/LessonForm';
import LessonsList from '../components/lessonsLog/LessonsList';
import LessonsFilters from '../components/lessonsLog/LessonsFilters';
import LessonCard from '../components/lessonsLog/LessonCard';
import CreateLessonsReportButton from '../components/lessonsReport/CreateLessonsReportButton';
import LessonsReportsWidget from '../components/lessonsReport/LessonsReportsWidget';

export default function LessonsLogView() {
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();
  
  const [log, setLog] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [summary, setSummary] = useState(null);
  const [corporateLessons, setCorporateLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    lesson_category: '',
    effect_type: '',
    status: '',
    lesson_scope: '',
    priority: '',
    is_corporate_lesson: undefined
  });

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

  const handleSaveLesson = async (lessonData) => {
    try {
      let result;
      if (selectedLesson) {
        result = await updateLesson(selectedLesson.id, lessonData);
      } else {
        result = await createLesson(lessonData);
      }

      if (result.success) {
        setShowForm(false);
        setSelectedLesson(null);
        fetchLessons();
        fetchData();
      } else {
        alert('Error saving lesson: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Error saving lesson: ' + error.message);
    }
  };

  const handleEdit = (lesson) => {
    setSelectedLesson(lesson);
    setShowForm(true);
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
    navigate(`/app/projects/${projectId}/lessons/${lesson.id}`);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lightbulb className="w-6 h-6" />
            Lessons Log
          </h1>
          {log && (
            <p className="text-sm text-gray-500 mt-1">
              Reference: {log.log_reference} • Version: {log.version_number || '1.0'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportListMenu columns={LESSON_COLUMNS} data={lessons} baseFilename="LessonsLog" disabled={!lessons?.length} />
          {log && (
            <>
              <button
                onClick={() => navigate(`/app/projects/${projectId}/lessons/reports`)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Reports
              </button>
              <button
                onClick={() => navigate(`/app/projects/${projectId}/lessons/reports/create`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Create Report
              </button>
              <button
                onClick={() => navigate(`/app/projects/${projectId}/lessons/report`)}
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
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Lesson
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">Total Lessons</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_lessons || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">Positive</p>
            <p className="text-2xl font-bold text-green-600">{summary.positive_lessons || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">Negative</p>
            <p className="text-2xl font-bold text-red-600">{summary.negative_lessons || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">Actions Pending</p>
            <p className="text-2xl font-bold text-orange-600">{summary.actions_pending || 0}</p>
          </div>
        </div>
      )}

      {/* Lessons Reports Widget */}
      {log && (
        <div className="mb-6">
          <LessonsReportsWidget projectId={projectId} lessonsLogId={log.id} />
        </div>
      )}

      {/* Corporate Lessons Panel */}
      {corporateLessons.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            💡 Relevant Corporate Lessons ({corporateLessons.length})
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
            Lessons from other projects that may be relevant to this project
          </p>
          <div className="space-y-2">
            {corporateLessons.slice(0, 3).map((lesson, index) => (
              <div key={lesson.lesson_id} className="bg-white dark:bg-gray-800 rounded p-2 text-sm">                <p className="font-medium text-gray-900 dark:text-white">{lesson.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{lesson.recommendations}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
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

      {/* Lesson Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedLesson ? 'Edit Lesson' : 'Add New Lesson'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedLesson(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <LessonForm
              lesson={selectedLesson}
              onSave={handleSaveLesson}
              onCancel={() => {
                setShowForm(false);
                setSelectedLesson(null);
              }}
              projectId={projectId}
            />
          </div>
        </div>
      )}

      {/* Lessons List */}
      <LessonsList
        lessons={lessons}
        loading={false}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPromote={() => {}}
        emptyMessage="No lessons found. Click 'Add Lesson' to get started."
      />
    </div>
  );
}

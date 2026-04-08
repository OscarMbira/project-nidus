/**
 * PMO Oversight – Lessons Log (full CRUD).
 * Project selector, tabs: All | Positive | Negative | Corporate, list with Edit/Delete, Create via LessonForm.
 */

import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext';
import { getAllProjects } from '../../services/pmoAdminService';
import { getLessonsByProject, deleteLesson } from '../../services/lessonService';
import PMOOversightHeader from '../../components/pmo/PMOOversightHeader';
import LessonForm from '../../components/lessonsLog/LessonForm';
import ExportListMenu from '../../components/ui/ExportListMenu';
import { useToastContext } from '../../context/ToastContext';

const TABS = [
  { id: 'all', label: 'All Lessons' },
  { id: 'positive', label: 'Positive' },
  { id: 'negative', label: 'Negative' },
  { id: 'corporate', label: 'Corporate' },
];

const EXPORT_COLUMNS = [
  { key: 'lesson_reference', label: 'Reference' },
  { key: 'lesson_title', label: 'Title' },
  { key: 'lesson_category', label: 'Category' },
  { key: 'effect_type', label: 'Effect' },
  { key: 'status', label: 'Status' },
  { key: 'lesson_scope', label: 'Scope' },
  { key: 'priority', label: 'Priority' },
  { key: 'project_name', label: 'Project' },
];

export default function PMOOversightLessonsLog() {
  const toast = useToastContext();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({ search: '', status: '' });

  useEffect(() => {
    let cancelled = false;
    getAllProjects().then((res) => {
      if (!cancelled && res.success) setProjects(res.data || []);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      if (selectedProjectId) {
        const res = await getLessonsByProject(selectedProjectId, filters);
        if (!cancelled && res.success) setLessons(res.data || []);
      } else {
        const res = await getAllProjects();
        if (!cancelled && !res.success) {
          setLessons([]);
          setLoading(false);
          return;
        }
        const list = res.data || [];
        const all = [];
        for (const p of list) {
          const r = await getLessonsByProject(p.id, filters);
          if (!cancelled && r.success && r.data?.length) {
            r.data.forEach((lesson) =>
              all.push({
                ...lesson,
                project_name: lesson.project?.project_name || p.project_name,
                project_code: lesson.project?.project_code || p.project_code,
              })
            );
          }
        }
        if (!cancelled) setLessons(all);
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [selectedProjectId, filters.search, filters.status]);

  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return lessons;
    if (activeTab === 'corporate') return lessons.filter((l) => l.is_corporate_lesson === true);
    return lessons.filter((l) => (l.effect_type || '').toLowerCase() === activeTab);
  }, [lessons, activeTab]);

  const stats = useMemo(() => {
    const positive = lessons.filter((l) => (l.effect_type || '').toLowerCase() === 'positive').length;
    const negative = lessons.filter((l) => (l.effect_type || '').toLowerCase() === 'negative').length;
    const corporate = lessons.filter((l) => l.is_corporate_lesson === true).length;
    const implemented = lessons.filter((l) => (l.status || '').toLowerCase() === 'implemented').length;
    return [
      { label: 'Total Lessons', value: lessons.length },
      { label: 'Positive', value: positive },
      { label: 'Negative', value: negative },
      { label: 'Corporate', value: corporate },
      { label: 'Implemented', value: implemented },
    ];
  }, [lessons]);

  const handleDelete = async (lesson) => {
    if (!window.confirm(`Delete lesson "${lesson.lesson_title || lesson.lesson_reference}"?`)) return;
    setDeletingId(lesson.id);
    try {
      await deleteLesson(lesson.id);
      toast.success('Lesson deleted.');
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setSelectedLesson(null);
    setLoading(true);
    const pid = selectedProjectId;
    if (pid) {
      getLessonsByProject(pid, filters).then((res) => {
        if (res.success) setLessons(res.data || []);
        setLoading(false);
      });
    } else {
      getAllProjects().then((res) => {
        if (!res.success) {
          setLoading(false);
          return;
        }
        const list = res.data || [];
        Promise.all(list.map((p) => getLessonsByProject(p.id, filters))).then((results) => {
          const all = [];
          results.forEach((r, i) => {
            if (r.success && r.data?.length)
              r.data.forEach((lesson) =>
                all.push({
                  ...lesson,
                  project_name: list[i]?.project_name,
                  project_code: list[i]?.project_code,
                })
              );
          });
          setLessons(all);
          setLoading(false);
        });
      });
    }
  };

  const openCreate = () => {
    if (!selectedProjectId) {
      toast.error('Select a project to add a lesson.');
      return;
    }
    setSelectedLesson(null);
    setShowForm(true);
  };

  const projectLabel = (lesson) =>
    lesson.project_name || lesson.project?.project_name || (lesson.project_code ? `(${lesson.project_code})` : '—');

  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PMOOversightHeader
          title="Lessons Log"
          description="View and manage lessons learned across projects (full CRUD)."
          icon={BookOpen}
          stats={stats}
          projectId={selectedProjectId}
          projects={projects}
          onProjectChange={setSelectedProjectId}
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Lesson
          </button>
          <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-gray-100 dark:bg-gray-700">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${activeTab === t.id ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-48"
          />
          <ExportListMenu
            columns={EXPORT_COLUMNS}
            data={filteredByTab.map((l) => ({
              ...l,
              project_name: projectLabel(l),
              lesson_reference: l.lesson_reference || l.lesson_code,
            }))}
            baseFilename="PMO-Lessons-Log"
            disabled={!filteredByTab.length}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Effect</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Scope</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                    {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredByTab.length === 0 ? (
                    <tr>
                      <td colSpan={selectedProjectId ? 8 : 9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No lessons match.
                      </td>
                    </tr>
                  ) : (
                    filteredByTab.map((lesson) => (
                      <tr key={lesson.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{lesson.lesson_reference || lesson.lesson_code || '—'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{lesson.lesson_title || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{lesson.lesson_category || '—'}</td>
                        <td className="px-4 py-3 text-sm">{lesson.effect_type || '—'}</td>
                        <td className="px-4 py-3 text-sm">{lesson.status || '—'}</td>
                        <td className="px-4 py-3 text-sm">{lesson.lesson_scope || '—'}</td>
                        <td className="px-4 py-3 text-sm">{lesson.priority || '—'}</td>
                        {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(lesson)}</td>}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => { setSelectedLesson(lesson); setShowForm(true); }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(lesson)}
                            disabled={deletingId === lesson.id}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <LessonForm
            lesson={selectedLesson}
            projectId={selectedProjectId || selectedLesson?.project_id}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setSelectedLesson(null); }}
          />
        )}
      </div>
    </DocumentGovernanceProvider>
  );
}

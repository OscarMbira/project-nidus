/**
 * Simulator PMO Oversight – Practice Lessons Log (full CRUD).
 * Project selector, list of lesson entries across projects with View/Edit via navigation, Add via navigation.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Pencil } from 'lucide-react';
import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext';
import { simDb } from '../../../services/supabase/supabaseClient';
import { getMyPracticeProjects } from '../../../services/sim/practiceProjectService';
import {
  getPracticeLessonsLog,
  getPracticeLessonEntries,
} from '../../../services/sim/practiceLessonsService';
import PMOOversightHeader from '../../../components/pmo/PMOOversightHeader';
import ExportListMenu from '../../../components/ui/ExportListMenu';
import { useToastContext } from '../../../context/ToastContext';
import { TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'

const EXPORT_COLUMNS = [
  { key: 'lesson_title', label: 'Title' },
  { key: 'lesson_description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'effect_type', label: 'Effect' },
  { key: 'project_name', label: 'Project' },
];

export default function SimulatorPMOOversightLessonsLog() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [entries, setEntries] = useState([]);
  const [logByProject, setLogByProject] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: { user } } = await simDb.auth.getUser();
        if (!user || cancelled) return;
        const u = await simDb.from('users').select('id').eq('auth_user_id', user.id).single();
        if (u.data?.id && !cancelled) {
          const res = await getMyPracticeProjects(u.data.id);
          if (res.success) setProjects(res.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      try {
        if (selectedProjectId) {
          const logRes = await getPracticeLessonsLog(selectedProjectId);
          const log = logRes.success ? logRes.data : null;
          if (!cancelled && log?.id) {
            setLogByProject(new Map([[selectedProjectId, log]]));
            const entRes = await getPracticeLessonEntries(log.id, filters);
            const list = entRes.success ? entRes.data || [] : [];
            setEntries(list.map((e) => ({ ...e, _log_id: log.id, practice_project_id: selectedProjectId })));
          } else {
            setLogByProject(new Map());
            setEntries([]);
          }
        } else {
          const projList = projects || [];
          const allEntries = [];
          const logMap = new Map();
          for (const p of projList) {
            const logRes = await getPracticeLessonsLog(p.id);
            const log = logRes.success ? logRes.data : null;
            if (!cancelled && log?.id) {
              logMap.set(p.id, log);
              const entRes = await getPracticeLessonEntries(log.id, filters);
              if (entRes.success && entRes.data?.length) {
                entRes.data.forEach((e) => allEntries.push({ ...e, project_name: p.project_name, project_code: p.project_code, _log_id: log.id }));
              }
            }
          }
          if (!cancelled) {
            setLogByProject(logMap);
            setEntries(allEntries);
          }
        }
      } catch (e) {
        if (!cancelled) toast.error('Failed to load lessons');
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (selectedProjectId || projects.length > 0) run();
    else setLoading(false);
    return () => { cancelled = true; };
  }, [selectedProjectId, projects, filters.status, filters.effect_type]);

  const stats = useMemo(() => [
    { label: 'Total Entries', value: entries.length },
  ], [entries.length]);

  const openCreate = () => {
    if (!selectedProjectId) {
      toast.error('Select a project to add a lesson.');
      return;
    }
    const log = selectedProjectId ? logByProject.get(selectedProjectId) : null;
    if (log) {
      navigate(`/simulator/practice-lessons-log/${log.id}/entry?projectId=${selectedProjectId}`);
    } else {
      navigate(`/simulator/practice-lessons-log?projectId=${selectedProjectId}`);
    }
  };

  const projectLabel = (entry) => entry.project_name || (entry.project_code ? `(${entry.project_code})` : '—');

  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PMOOversightHeader
          title="Practice Lessons Log"
          description="View and manage practice lesson entries across projects (full CRUD)."
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
          <ExportListMenu
            columns={EXPORT_COLUMNS}
            data={entries.map((e) => ({ ...e, project_name: projectLabel(e) }))}
            baseFilename="Sim-PMO-Lessons-Log"
            disabled={!entries.length}
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
                <TableRowNumberHeader className="!normal-case" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Effect</th>
                    {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {entries.length === 0 ? (
                    <tr>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td colSpan={selectedProjectId ? 5 : 6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No lesson entries. Select a project and add lessons from the lessons log.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => {
                      const logId = entry._log_id ?? logByProject.get(entry.practice_project_id || selectedProjectId)?.id;
                      const projId = entry.practice_project_id || selectedProjectId;
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{entry.lesson_title || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">{entry.lesson_description || '—'}</td>
                          <td className="px-4 py-3 text-sm">{entry.status || '—'}</td>
                          <td className="px-4 py-3 text-sm">{entry.effect_type || '—'}</td>
                          {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(entry)}</td>}
                          <td className="px-4 py-3 text-right">
                            {logId && (
                              <button
                                type="button"
                                onClick={() => navigate(`/simulator/practice-lessons-log/${logId}/entry/${entry.id}?projectId=${projId}`)}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                aria-label="View/Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PracticeDocumentGovernanceProvider>
  );
}

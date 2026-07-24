/**
 * Simulator PMO Oversight – Practice Issue Register (full CRUD).
 * Project selector from user's practice projects, summary stats, list with Edit/Delete, Create via navigation.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext';
import { simDb } from '../../../services/supabase/supabaseClient';
import { getMyPracticeProjects } from '../../../services/sim/practiceProjectService';
import {
  getPracticeIssues,
  deletePracticeIssue,
} from '../../../services/sim/practiceIssueService';
import PMOOversightHeader from '../../../components/pmo/PMOOversightHeader';
import ExportListMenu from '../../../components/ui/ExportListMenu';
import { useToastContext } from '../../../context/ToastContext';
import { TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'

const EXPORT_COLUMNS = [
  { key: 'issue_title', label: 'Title' },
  { key: 'issue_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'project_name', label: 'Project' },
];

export default function SimulatorPMOOversightIssueRegister() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '' });

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
      if (selectedProjectId) {
        const res = await getPracticeIssues(selectedProjectId, filters);
        if (!cancelled && res.success) setIssues(res.data || []);
      } else {
        const { data: { user } } = await simDb.auth.getUser();
        if (!user || cancelled) { setLoading(false); setIssues([]); return; }
        const u = await simDb.from('users').select('id').eq('auth_user_id', user.id).single();
        if (!u.data?.id || cancelled) { setLoading(false); setIssues([]); return; }
        const res = await getMyPracticeProjects(u.data.id);
        if (!cancelled && !res.success) { setIssues([]); setLoading(false); return; }
        const list = res.data || [];
        const all = [];
        for (const p of list) {
          const r = await getPracticeIssues(p.id, filters);
          if (!cancelled && r.success && r.data?.length) {
            r.data.forEach((issue) => all.push({ ...issue, project_name: p.project_name, project_code: p.project_code }));
          }
        }
        if (!cancelled) setIssues(all);
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [selectedProjectId, filters.search, filters.status]);

  const stats = useMemo(() => {
    const open = issues.filter((i) => (i.status || '') === 'open').length;
    return [
      { label: 'Total Issues', value: issues.length },
      { label: 'Open', value: open },
    ];
  }, [issues]);

  const handleDelete = async (issue) => {
    if (!window.confirm(`Delete issue "${issue.issue_title}"?`)) return;
    setDeletingId(issue.id);
    try {
      await deletePracticeIssue(issue.id);
      toast.success('Issue deleted.');
      setIssues((prev) => prev.filter((i) => i.id !== issue.id));
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => {
    if (!selectedProjectId) {
      toast.error('Select a project to add an issue.');
      return;
    }
    navigate(`/simulator/practice-issue-register/create?projectId=${selectedProjectId}`);
  };

  const projectLabel = (issue) => issue.project_name || (issue.project_code ? `(${issue.project_code})` : '—');

  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PMOOversightHeader
          title="Practice Issue Register"
          description="View and manage practice issues across projects (full CRUD)."
          icon={AlertCircle}
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
            Add Issue
          </button>
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-48"
          />
          <ExportListMenu
            columns={EXPORT_COLUMNS}
            data={issues.map((i) => ({ ...i, project_name: projectLabel(i) }))}
            baseFilename="Sim-PMO-Issue-Register"
            disabled={!issues.length}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                    {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {issues.length === 0 ? (
                    <tr>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td colSpan={selectedProjectId ? 5 : 6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No issues match.
                      </td>
                    </tr>
                  ) : (
                    issues.map((issue, index) => (
                      <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{issue.issue_title || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{issue.issue_type || '—'}</td>
                        <td className="px-4 py-3 text-sm">{issue.status || '—'}</td>
                        <td className="px-4 py-3 text-sm">{issue.priority || '—'}</td>
                        {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(issue)}</td>}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/simulator/practice-issue-register/${issue.id}?projectId=${issue.practice_project_id || selectedProjectId}`)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            aria-label="View/Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(issue)}
                            disabled={deletingId === issue.id}
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
      </div>
    </PracticeDocumentGovernanceProvider>
  );
}

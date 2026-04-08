/**
 * PMO Oversight – Issue Register (full CRUD).
 * Project selector, summary stats, tabs by type, list with Edit/Delete, Create via IssueForm.
 */

import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext';
import { getAllProjects } from '../../services/pmoAdminService';
import { getIssues, deleteIssue } from '../../services/issueService';
import { getIssueRegisterByProject } from '../../services/issueRegisterService';
import PMOOversightHeader from '../../components/pmo/PMOOversightHeader';
import IssueForm from '../../components/IssueForm';
import ExportListMenu from '../../components/ui/ExportListMenu';
import { useToastContext } from '../../context/ToastContext';

const EXPORT_COLUMNS = [
  { key: 'issue_identifier', label: 'Issue ID' },
  { key: 'issue_title', label: 'Title' },
  { key: 'issue_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'severity', label: 'Severity' },
  { key: 'date_raised', label: 'Raised' },
  { key: 'project_name', label: 'Project' },
];

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'request_for_change', label: 'RFC' },
  { id: 'off_specification', label: 'Off-Spec' },
  { id: 'problem_concern', label: 'Problem' },
];

export default function PMOOversightIssueRegister() {
  const toast = useToastContext();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
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
        const register = await getIssueRegisterByProject(selectedProjectId);
        if (!cancelled && register?.id) {
          const data = await getIssues(register.id, filters);
          setIssues(Array.isArray(data) ? data : []);
        } else {
          if (!cancelled) setIssues([]);
        }
      } else {
        const res = await getAllProjects();
        if (!cancelled && !res.success) {
          setIssues([]);
          setLoading(false);
          return;
        }
        const list = res.data || [];
        const all = [];
        for (const p of list) {
          const reg = await getIssueRegisterByProject(p.id);
          if (!cancelled && reg?.id) {
            const data = await getIssues(reg.id, filters);
            const arr = Array.isArray(data) ? data : [];
            arr.forEach((i) => all.push({ ...i, project_name: p.project_name, project_code: p.project_code }));
          }
        }
        if (!cancelled) setIssues(all);
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [selectedProjectId, filters.search, filters.status]);

  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return issues;
    return issues.filter((i) => (i.issue_type || '') === activeTab);
  }, [issues, activeTab]);

  const stats = useMemo(() => {
    const open = issues.filter((i) => i.status === 'open').length;
    const rfc = issues.filter((i) => i.issue_type === 'request_for_change').length;
    const offSpec = issues.filter((i) => i.issue_type === 'off_specification').length;
    const problem = issues.filter((i) => i.issue_type === 'problem_concern').length;
    return [
      { label: 'Total Issues', value: issues.length },
      { label: 'Open', value: open },
      { label: 'RFCs', value: rfc },
      { label: 'Off-Spec', value: offSpec },
      { label: 'Problems', value: problem },
    ];
  }, [issues]);

  const handleDelete = async (issue) => {
    if (!window.confirm(`Delete issue "${issue.issue_title || issue.issue_identifier}"?`)) return;
    setDeletingId(issue.id);
    try {
      await deleteIssue(issue.id);
      toast.success('Issue deleted.');
      setIssues((prev) => prev.filter((i) => i.id !== issue.id));
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setSelectedIssue(null);
    setLoading(true);
    const pid = selectedProjectId;
    if (pid) {
      getIssueRegisterByProject(pid).then(async (reg) => {
        if (reg?.id) {
          const data = await getIssues(reg.id, filters);
          setIssues(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      getAllProjects().then((res) => {
        if (!res.success) { setLoading(false); return; }
        const list = res.data || [];
        Promise.all(list.map((p) => getIssueRegisterByProject(p.id))).then(async (regs) => {
          const all = [];
          for (let i = 0; i < regs.length; i++) {
            if (regs[i]?.id) {
              const data = await getIssues(regs[i].id, filters);
              const arr = Array.isArray(data) ? data : [];
              arr.forEach((iss) => all.push({ ...iss, project_name: list[i]?.project_name, project_code: list[i]?.project_code }));
            }
          }
          setIssues(all);
          setLoading(false);
        });
      });
    }
  };

  const openCreate = () => {
    if (!selectedProjectId) {
      toast.error('Select a project to add an issue.');
      return;
    }
    setSelectedIssue(null);
    setShowForm(true);
  };

  const projectLabel = (issue) => issue.project_name || issue.project?.project_name || (issue.project_code ? `(${issue.project_code})` : '—');

  const registerIdForProject = (projectId) => {
    // When editing we need register id; we'll get it when opening form from selectedIssue's issue_register_id
    return selectedIssue?.issue_register_id || null;
  };

  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PMOOversightHeader
          title="Issue Register"
          description="View and manage issues across projects (full CRUD)."
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
            data={filteredByTab.map((i) => ({ ...i, project_name: projectLabel(i), issue_identifier: i.issue_identifier || i.issue_code }))}
            baseFilename="PMO-Issue-Register"
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Raised</th>
                    {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredByTab.length === 0 ? (
                    <tr>
                      <td colSpan={selectedProjectId ? 7 : 8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No issues match.
                      </td>
                    </tr>
                  ) : (
                    filteredByTab.map((issue) => (
                      <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{issue.issue_identifier || issue.issue_code || '—'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{issue.issue_title || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{issue.issue_type || '—'}</td>
                        <td className="px-4 py-3 text-sm">{issue.status || '—'}</td>
                        <td className="px-4 py-3 text-sm">{issue.priority || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{issue.date_raised || '—'}</td>
                        {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(issue)}</td>}
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => { setSelectedIssue(issue); setShowForm(true); }} className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600" aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(issue)} disabled={deletingId === issue.id} className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 disabled:opacity-50" aria-label="Delete">
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
          <IssueForm
            issue={selectedIssue}
            projectId={selectedProjectId || selectedIssue?.project_id}
            issueRegisterId={selectedIssue?.issue_register_id || registerIdForProject(selectedProjectId)}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setSelectedIssue(null); }}
          />
        )}
      </div>
    </DocumentGovernanceProvider>
  );
}

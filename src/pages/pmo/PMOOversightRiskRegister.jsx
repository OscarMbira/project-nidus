/**
 * PMO Oversight – Risk Register (full CRUD).
 * Project selector (All Projects | specific), summary stats, list with Edit/Delete, Create via EnhancedRiskForm.
 */

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react';
import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext';
import { getAllProjects } from '../../services/pmoAdminService';
import { getRisksByProject, deleteRisk } from '../../services/riskService';
import PMOOversightHeader from '../../components/pmo/PMOOversightHeader';
import EnhancedRiskForm from '../../components/risks/EnhancedRiskForm';
import ExportListMenu from '../../components/ui/ExportListMenu';
import { useToastContext } from '../../context/ToastContext';

const EXPORT_COLUMNS = [
  { key: 'risk_identifier', label: 'Risk ID' },
  { key: 'risk_title', label: 'Title' },
  { key: 'risk_type', label: 'Type' },
  { key: 'risk_category', label: 'Category' },
  { key: 'status_enum', label: 'Status' },
  { key: 'pre_risk_score', label: 'Level' },
  { key: 'proximity', label: 'Proximity' },
  { key: 'project_name', label: 'Project' },
];

export default function PMOOversightRiskRegister() {
  const toast = useToastContext();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', risk_level: '' });

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
        const res = await getRisksByProject(selectedProjectId, filters);
        if (!cancelled && res.success) setRisks(res.data || []);
      } else {
        const res = await getAllProjects();
        if (!cancelled && !res.success) {
          setRisks([]);
          setLoading(false);
          return;
        }
        const list = res.data || [];
        const all = [];
        for (const p of list) {
          const r = await getRisksByProject(p.id, filters);
          if (!cancelled && r.success && r.data?.length) {
            const withProject = r.data.map((risk) => ({
              ...risk,
              project_name: risk.project?.project_name || p.project_name,
              project_code: risk.project?.project_code || p.project_code,
            }));
            all.push(...withProject);
          }
        }
        if (!cancelled) setRisks(all);
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [selectedProjectId, filters.search, filters.status, filters.risk_level]);

  const stats = useMemo(() => {
    const open = risks.filter((r) => (r.status_enum || r.status) === 'open').length;
    const highCritical = risks.filter((r) => {
      const level = (r.pre_risk_score ?? r.risk_level ?? '').toString().toLowerCase();
      return level === 'high' || level === 'critical' || level === '4' || level === '5';
    }).length;
    const closed = risks.filter((r) => (r.status_enum || r.status) === 'closed').length;
    return [
      { label: 'Total Risks', value: risks.length },
      { label: 'Open', value: open },
      { label: 'High/Critical', value: highCritical },
      { label: 'Closed', value: closed },
    ];
  }, [risks]);

  const handleDelete = async (risk) => {
    if (!window.confirm(`Delete risk "${risk.risk_title || risk.risk_identifier}"?`)) return;
    setDeletingId(risk.id);
    try {
      const res = await deleteRisk(risk.id);
      if (res?.success !== false) {
        toast.success('Risk deleted.');
        setRisks((prev) => prev.filter((r) => r.id !== risk.id));
      } else {
        toast.error(res?.error || 'Delete failed');
      }
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setSelectedRisk(null);
    setLoading(true);
    const pid = selectedProjectId;
    if (pid) {
      getRisksByProject(pid, filters).then((res) => {
        if (res.success) setRisks(res.data || []);
        setLoading(false);
      });
    } else {
      getAllProjects().then((res) => {
        if (!res.success) {
          setLoading(false);
          return;
        }
        const list = res.data || [];
        Promise.all(list.map((p) => getRisksByProject(p.id, filters))).then((results) => {
          const all = [];
          results.forEach((r, i) => {
            if (r.success && r.data?.length)
              r.data.forEach((risk) =>
                all.push({
                  ...risk,
                  project_name: list[i]?.project_name,
                  project_code: list[i]?.project_code,
                })
              );
          });
          setRisks(all);
          setLoading(false);
        });
      });
    }
  };

  const openCreate = () => {
    if (!selectedProjectId) {
      toast.error('Select a project to add a risk.');
      return;
    }
    setSelectedRisk(null);
    setShowForm(true);
  };

  const projectLabel = (risk) =>
    risk.project_name || risk.project?.project_name || (risk.project_code ? `(${risk.project_code})` : '—');

  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PMOOversightHeader
          title="Risk Register"
          description="View and manage risks across projects (full CRUD)."
          icon={AlertTriangle}
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
            Add Risk
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
            data={risks.map((r) => ({
              ...r,
              project_name: projectLabel(r),
            }))}
            baseFilename="PMO-Risk-Register"
            disabled={!risks.length}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Level</th>
                    {!selectedProjectId && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {risks.length === 0 ? (
                    <tr>
                      <td colSpan={selectedProjectId ? 7 : 8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        {selectedProjectId ? 'No risks for this project.' : 'No risks. Select a project or add risks from a project.'}
                      </td>
                    </tr>
                  ) : (
                    risks.map((risk) => (
                      <tr key={risk.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{risk.risk_identifier || risk.risk_code || '—'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{risk.risk_title || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{risk.risk_type || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{risk.risk_category || '—'}</td>
                        <td className="px-4 py-3 text-sm">{risk.status_enum || risk.status || '—'}</td>
                        <td className="px-4 py-3 text-sm">{risk.pre_risk_score ?? risk.risk_level ?? '—'}</td>
                        {!selectedProjectId && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(risk)}</td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => { setSelectedRisk(risk); setShowForm(true); }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(risk)}
                            disabled={deletingId === risk.id}
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
          <EnhancedRiskForm
            risk={selectedRisk}
            projectId={selectedProjectId || selectedRisk?.project_id}
            riskRegisterId={selectedRisk?.risk_register_id}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setSelectedRisk(null); }}
          />
        )}
      </div>
    </DocumentGovernanceProvider>
  );
}

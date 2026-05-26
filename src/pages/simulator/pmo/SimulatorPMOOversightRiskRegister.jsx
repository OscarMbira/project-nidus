/**
 * Simulator PMO Oversight – Practice Risk Register (full CRUD).
 * Project selector from user's practice projects, summary stats, list with Edit/Delete, Create via navigation.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react';
import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext';
import { simDb } from '../../../services/supabase/supabaseClient';
import { getMyPracticeProjects } from '../../../services/sim/practiceProjectService';
import {
  getPracticeRisks,
  deletePracticeRisk,
} from '../../../services/sim/practiceRiskService';
import PMOOversightHeader from '../../../components/pmo/PMOOversightHeader';
import ExportListMenu from '../../../components/ui/ExportListMenu';
import { useToastContext } from '../../../context/ToastContext';
import { TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'

const EXPORT_COLUMNS = [
  { key: 'risk_title', label: 'Title' },
  { key: 'risk_type', label: 'Type' },
  { key: 'risk_category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'risk_level', label: 'Level' },
  { key: 'project_name', label: 'Project' },
];

export default function SimulatorPMOOversightRiskRegister() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', risk_level: '' });

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
        const res = await getPracticeRisks(selectedProjectId, filters);
        if (!cancelled && res.success) setRisks(res.data || []);
      } else {
        const { data: { user } } = await simDb.auth.getUser();
        if (!user || cancelled) { setLoading(false); setRisks([]); return; }
        const u = await simDb.from('users').select('id').eq('auth_user_id', user.id).single();
        if (!u.data?.id || cancelled) { setLoading(false); setRisks([]); return; }
        const res = await getMyPracticeProjects(u.data.id);
        if (!cancelled && !res.success) { setRisks([]); setLoading(false); return; }
        const list = res.data || [];
        const all = [];
        for (const p of list) {
          const r = await getPracticeRisks(p.id, filters);
          if (!cancelled && r.success && r.data?.length) {
            r.data.forEach((risk) => all.push({ ...risk, project_name: p.project_name, project_code: p.project_code }));
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
    const open = risks.filter((r) => (r.status || '') === 'open').length;
    const highCritical = risks.filter((r) => {
      const level = (r.risk_level || r.risk_score || '').toString().toLowerCase();
      return level === 'high' || level === 'critical' || level === '4' || level === '5';
    }).length;
    const closed = risks.filter((r) => (r.status || '') === 'closed').length;
    return [
      { label: 'Total Risks', value: risks.length },
      { label: 'Open', value: open },
      { label: 'High/Critical', value: highCritical },
      { label: 'Closed', value: closed },
    ];
  }, [risks]);

  const handleDelete = async (risk) => {
    if (!window.confirm(`Delete risk "${risk.risk_title}"?`)) return;
    setDeletingId(risk.id);
    try {
      await deletePracticeRisk(risk.id);
      toast.success('Risk deleted.');
      setRisks((prev) => prev.filter((r) => r.id !== risk.id));
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => {
    if (!selectedProjectId) {
      toast.error('Select a project to add a risk.');
      return;
    }
    navigate(`/simulator/practice-risk-register/create?projectId=${selectedProjectId}`);
  };

  const projectLabel = (risk) => risk.project_name || (risk.project_code ? `(${risk.project_code})` : '—');

  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PMOOversightHeader
          title="Practice Risk Register"
          description="View and manage practice risks across projects (full CRUD)."
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
            data={risks.map((r) => ({ ...r, project_name: projectLabel(r) }))}
            baseFilename="Sim-PMO-Risk-Register"
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
                <TableRowNumberHeader className="!normal-case" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Level</th>
                    {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {risks.length === 0 ? (
                    <tr>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td colSpan={selectedProjectId ? 6 : 7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        {selectedProjectId ? 'No risks for this project.' : 'No risks. Select a project or add risks from a project.'}
                      </td>
                    </tr>
                  ) : (
                    risks.map((risk, index) => (
                      <tr key={risk.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{risk.risk_title || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{risk.risk_type || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{risk.risk_category || '—'}</td>
                        <td className="px-4 py-3 text-sm">{risk.status || '—'}</td>
                        <td className="px-4 py-3 text-sm">{risk.risk_level ?? risk.risk_score ?? '—'}</td>
                        {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(risk)}</td>}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/simulator/practice-risk-register/${risk.id}?projectId=${risk.practice_project_id || selectedProjectId}`)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            aria-label="View/Edit"
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
      </div>
    </PracticeDocumentGovernanceProvider>
  );
}

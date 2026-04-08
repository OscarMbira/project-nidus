/**
 * Simulator PMO Oversight – Practice Quality Register (full CRUD).
 * Project selector, tabs: Register | Reviews | Inspections, list with Edit/Delete, Create via navigation.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Plus, Pencil, Trash2 } from 'lucide-react';
import { PracticeDocumentGovernanceProvider } from '../../../context/PracticeDocumentGovernanceContext';
import { simDb } from '../../../services/supabase/supabaseClient';
import { getMyPracticeProjects } from '../../../services/sim/practiceProjectService';
import {
  getPracticeQualityRegister,
  getPracticeQualityReviews,
  getPracticeQualityInspections,
  deletePracticeQualityItem,
  deletePracticeQualityReview,
  deletePracticeQualityInspection,
} from '../../../services/sim/practiceQualityService';
import PMOOversightHeader from '../../../components/pmo/PMOOversightHeader';
import ExportListMenu from '../../../components/ui/ExportListMenu';
import { useToastContext } from '../../../context/ToastContext';

const TABS = [
  { id: 'register', label: 'Register' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'inspections', label: 'Inspections' },
];

export default function SimulatorPMOOversightQualityRegister() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [registerItems, setRegisterItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('register');
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters] = useState({ search: '' });

  const projectMap = useMemo(() => new Map((projects || []).map((p) => [p.id, p])), [projects]);

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
          const [regRes, revRes, inspRes] = await Promise.all([
            getPracticeQualityRegister(selectedProjectId, filters),
            getPracticeQualityReviews({ practice_project_id: selectedProjectId }),
            getPracticeQualityInspections({ practice_project_id: selectedProjectId }),
          ]);
          if (!cancelled) {
            setRegisterItems(regRes.success ? regRes.data || [] : []);
            setReviews(revRes.success ? revRes.data || [] : []);
            setInspections(inspRes.success ? inspRes.data || [] : []);
          }
        } else {
          const projList = Array.from(projectMap.entries());
          const [revRes, inspRes] = await Promise.all([
            getPracticeQualityReviews({}),
            getPracticeQualityInspections({}),
          ]);
          const regByProject = [];
          for (const [pid, p] of projList) {
            const r = await getPracticeQualityRegister(pid, filters);
            if (!cancelled && r.success && r.data?.length)
              r.data.forEach((item) => regByProject.push({ ...item, project_name: p.project_name }));
          }
          if (!cancelled) {
            setRegisterItems(regByProject);
            setReviews(revRes.success ? (revRes.data || []).map((r) => ({ ...r, project_name: projectMap.get(r.practice_project_id)?.project_name })) : []);
            setInspections(inspRes.success ? (inspRes.data || []).map((i) => ({ ...i, project_name: projectMap.get(i.practice_project_id)?.project_name })) : []);
          }
        }
      } catch (e) {
        if (!cancelled) toast.error('Failed to load quality data');
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (selectedProjectId || projectMap.size > 0) run();
    else setLoading(false);
    return () => { cancelled = true; };
  }, [selectedProjectId, filters.search, projects]);

  const stats = useMemo(() => [
    { label: 'Total Products', value: registerItems.length },
    { label: 'Reviews', value: reviews.length },
    { label: 'Inspections', value: inspections.length },
  ], [registerItems.length, reviews.length, inspections.length]);

  const handleDeleteRegister = async (item) => {
    if (!window.confirm(`Delete "${item.product_name || item.product_reference}"?`)) return;
    setDeletingId(item.id);
    try {
      await deletePracticeQualityItem(item.id);
      toast.success('Item deleted.');
      setRegisterItems((prev) => prev.filter((r) => r.id !== item.id));
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteReview = async (item) => {
    if (!window.confirm(`Delete review "${item.review_title}"?`)) return;
    setDeletingId(item.id);
    try {
      await deletePracticeQualityReview(item.id);
      toast.success('Review deleted.');
      setReviews((prev) => prev.filter((r) => r.id !== item.id));
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteInspection = async (item) => {
    if (!window.confirm(`Delete inspection "${item.inspection_title}"?`)) return;
    setDeletingId(item.id);
    try {
      await deletePracticeQualityInspection(item.id);
      toast.success('Inspection deleted.');
      setInspections((prev) => prev.filter((r) => r.id !== item.id));
    } catch (e) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = () => {
    if (!selectedProjectId) {
      toast.error('Select a project to add a quality item.');
      return;
    }
    if (activeTab === 'register') navigate(`/simulator/practice-quality-register/create?projectId=${selectedProjectId}`);
    else if (activeTab === 'reviews') navigate(`/simulator/practice-quality-reviews?projectId=${selectedProjectId}`);
    else navigate(`/simulator/practice-quality-inspections?projectId=${selectedProjectId}`);
  };

  const projectLabel = (row) => row.project_name || projectMap.get(row.practice_project_id)?.project_name || '—';

  const REGISTER_COLUMNS = [{ key: 'product_name', label: 'Product' }, { key: 'quality_status', label: 'Status' }, { key: 'project_name', label: 'Project' }];
  const REVIEWS_COLUMNS = [{ key: 'review_title', label: 'Title' }, { key: 'review_status', label: 'Status' }, { key: 'project_name', label: 'Project' }];
  const INSPECTIONS_COLUMNS = [{ key: 'inspection_title', label: 'Title' }, { key: 'inspection_result', label: 'Result' }, { key: 'project_name', label: 'Project' }];

  const exportData = activeTab === 'register'
    ? registerItems.map((r) => ({ ...r, project_name: projectLabel(r) }))
    : activeTab === 'reviews'
      ? reviews.map((r) => ({ ...r, project_name: projectLabel(r) }))
      : inspections.map((r) => ({ ...r, project_name: projectLabel(r) }));
  const exportColumns = activeTab === 'register' ? REGISTER_COLUMNS : activeTab === 'reviews' ? REVIEWS_COLUMNS : INSPECTIONS_COLUMNS;

  return (
    <PracticeDocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PMOOversightHeader
          title="Practice Quality Register"
          description="View and manage practice quality register, reviews, and inspections (full CRUD)."
          icon={CheckSquare}
          stats={stats}
          projectId={selectedProjectId}
          projects={projects}
          onProjectChange={setSelectedProjectId}
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            <Plus className="h-4 w-4" /> Add {activeTab === 'register' ? 'Item' : activeTab === 'reviews' ? 'Review' : 'Inspection'}
          </button>
          <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-gray-100 dark:bg-gray-700">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} className={`px-3 py-1.5 rounded text-sm font-medium ${activeTab === t.id ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <ExportListMenu columns={exportColumns} data={exportData} baseFilename="Sim-PMO-Quality" disabled={!exportData.length} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" /></div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === 'register' && (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {registerItems.length === 0 ? (
                      <tr><td colSpan={selectedProjectId ? 3 : 4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No register items.</td></tr>
                    ) : (
                      registerItems.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.product_name || r.product_reference || '—'}</td>
                          <td className="px-4 py-3 text-sm">{r.quality_status || '—'}</td>
                          {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(r)}</td>}
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => navigate(`/simulator/practice-quality-activity/${r.id}?projectId=${r.practice_project_id || selectedProjectId}`)} className="p-2 text-gray-600 hover:text-blue-600" aria-label="View"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => handleDeleteRegister(r)} disabled={deletingId === r.id} className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
              {activeTab === 'reviews' && (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {reviews.length === 0 ? <tr><td colSpan={selectedProjectId ? 3 : 4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No reviews.</td></tr> : reviews.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.review_title || '—'}</td>
                        <td className="px-4 py-3 text-sm">{r.review_status || '—'}</td>
                        {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(r)}</td>}
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => handleDeleteReview(r)} disabled={deletingId === r.id} className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'inspections' && (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Result</th>
                      {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {inspections.length === 0 ? <tr><td colSpan={selectedProjectId ? 3 : 4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No inspections.</td></tr> : inspections.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.inspection_title || '—'}</td>
                        <td className="px-4 py-3 text-sm">{r.inspection_result || '—'}</td>
                        {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(r)}</td>}
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => handleDeleteInspection(r)} disabled={deletingId === r.id} className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </PracticeDocumentGovernanceProvider>
  );
}

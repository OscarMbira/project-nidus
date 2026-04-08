/**
 * PMO Oversight – Quality Register (full CRUD).
 * Project selector, tabs: Register | Reviews | Inspections, list with Edit/Delete, Create via forms.
 */

import { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Plus, Pencil, Trash2 } from 'lucide-react';
import { DocumentGovernanceProvider } from '../../context/DocumentGovernanceContext';
import { getAllProjects } from '../../services/pmoAdminService';
import {
  getQualityRegister,
  getQualityReviews,
  getQualityInspections,
  deleteQualityRegisterItem,
  deleteQualityReview,
  deleteQualityInspection,
} from '../../services/qualityManagementService';
import PMOOversightHeader from '../../components/pmo/PMOOversightHeader';
import QualityRegisterForm from '../../components/quality/QualityRegisterForm';
import QualityReviewForm from '../../components/quality/QualityReviewForm';
import QualityInspectionForm from '../../components/quality/QualityInspectionForm';
import ExportListMenu from '../../components/ui/ExportListMenu';
import { useToastContext } from '../../context/ToastContext';

const TABS = [
  { id: 'register', label: 'Register' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'inspections', label: 'Inspections' },
];

const REGISTER_COLUMNS = [
  { key: 'product_reference', label: 'Ref' },
  { key: 'product_name', label: 'Product' },
  { key: 'product_type', label: 'Type' },
  { key: 'quality_status', label: 'Status' },
  { key: 'project_name', label: 'Project' },
];
const REVIEWS_COLUMNS = [
  { key: 'review_title', label: 'Title' },
  { key: 'review_type', label: 'Type' },
  { key: 'planned_date', label: 'Planned' },
  { key: 'review_status', label: 'Status' },
  { key: 'project_name', label: 'Project' },
];
const INSPECTIONS_COLUMNS = [
  { key: 'inspection_title', label: 'Title' },
  { key: 'inspection_date', label: 'Date' },
  { key: 'inspection_result', label: 'Result' },
  { key: 'project_name', label: 'Project' },
];

function projectLabel(row) {
  return row.project?.project_name || row.project_name || (row.project?.project_code ? `(${row.project.project_code})` : '—');
}

export default function PMOOversightQualityRegister() {
  const toast = useToastContext();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [registerItems, setRegisterItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('register');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters] = useState({ search: '' });

  const qFilters = useMemo(
    () => (selectedProjectId ? { ...filters, project_id: selectedProjectId } : filters),
    [selectedProjectId, filters]
  );

  useEffect(() => {
    let cancelled = false;
    getAllProjects().then((res) => {
      if (!cancelled && res.success) setProjects(res.data || []);
    });
    return () => { cancelled = true; };
  }, []);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      getQualityRegister(qFilters),
      getQualityReviews(qFilters),
      getQualityInspections(qFilters),
    ])
      .then(([regData, revData, inspData]) => {
        setRegisterItems(Array.isArray(regData) ? regData : []);
        setReviews(Array.isArray(revData) ? revData : []);
        setInspections(Array.isArray(inspData) ? inspData : []);
      })
      .catch((e) => {
        toast.error('Failed to load quality data');
        console.error(e);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getQualityRegister(qFilters),
      getQualityReviews(qFilters),
      getQualityInspections(qFilters),
    ])
      .then(([regData, revData, inspData]) => {
        if (!cancelled) {
          setRegisterItems(Array.isArray(regData) ? regData : []);
          setReviews(Array.isArray(revData) ? revData : []);
          setInspections(Array.isArray(inspData) ? inspData : []);
        }
      })
      .catch((e) => {
        if (!cancelled) toast.error('Failed to load quality data');
        console.error(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [qFilters, toast]);

  const stats = useMemo(() => {
    const passed = registerItems.filter((r) => (r.quality_status || '').toLowerCase() === 'passed').length;
    const failed = registerItems.filter((r) => (r.quality_status || '').toLowerCase() === 'failed').length;
    const inReview = registerItems.filter((r) => (r.quality_status || '').toLowerCase().includes('review')).length;
    return [
      { label: 'Total Products', value: registerItems.length },
      { label: 'Passed', value: passed },
      { label: 'Failed', value: failed },
      { label: 'In Review', value: inReview },
    ];
  }, [registerItems]);

  const handleDeleteRegister = async (item) => {
    if (!window.confirm(`Delete "${item.product_name || item.product_reference}"?`)) return;
    setDeletingId(item.id);
    try {
      await deleteQualityRegisterItem(item.id);
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
      await deleteQualityReview(item.id);
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
      await deleteQualityInspection(item.id);
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
    if (activeTab === 'register') {
      setSelectedRegister(null);
      setShowRegisterForm(true);
    } else if (activeTab === 'reviews') {
      setSelectedReview(null);
      setShowReviewForm(true);
    } else {
      setSelectedInspection(null);
      setShowInspectionForm(true);
    }
  };

  const exportData = useMemo(() => {
    if (activeTab === 'register') return registerItems.map((r) => ({ ...r, project_name: projectLabel(r) }));
    if (activeTab === 'reviews') return reviews.map((r) => ({ ...r, project_name: projectLabel(r) }));
    return inspections.map((r) => ({ ...r, project_name: projectLabel(r) }));
  }, [activeTab, registerItems, reviews, inspections]);

  const exportColumns = activeTab === 'register' ? REGISTER_COLUMNS : activeTab === 'reviews' ? REVIEWS_COLUMNS : INSPECTIONS_COLUMNS;

  return (
    <DocumentGovernanceProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PMOOversightHeader
          title="Quality Register"
          description="View and manage quality register, reviews, and inspections (full CRUD)."
          icon={CheckSquare}
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
            Add {activeTab === 'register' ? 'Item' : activeTab === 'reviews' ? 'Review' : 'Inspection'}
          </button>
          <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-gray-100 dark:bg-gray-700">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${activeTab === t.id ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
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
          <ExportListMenu columns={exportColumns} data={exportData} baseFilename="PMO-Quality-Register" disabled={!exportData.length} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === 'register' && (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ref</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {registerItems.length === 0 ? (
                      <tr>
                        <td colSpan={selectedProjectId ? 5 : 6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No register items.</td>
                      </tr>
                    ) : (
                      registerItems.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{r.product_reference || '—'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.product_name || '—'}</td>
                          <td className="px-4 py-3 text-sm">{r.product_type || '—'}</td>
                          <td className="px-4 py-3 text-sm">{r.quality_status || '—'}</td>
                          {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(r)}</td>}
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => { setSelectedRegister(r); setShowRegisterForm(true); }} className="p-2 text-gray-600 hover:text-blue-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Planned</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {reviews.length === 0 ? (
                      <tr>
                        <td colSpan={selectedProjectId ? 5 : 6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No reviews.</td>
                      </tr>
                    ) : (
                      reviews.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.review_title || '—'}</td>
                          <td className="px-4 py-3 text-sm">{r.review_type || '—'}</td>
                          <td className="px-4 py-3 text-sm">{r.planned_date || '—'}</td>
                          <td className="px-4 py-3 text-sm">{r.review_status || '—'}</td>
                          {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(r)}</td>}
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => { setSelectedReview(r); setShowReviewForm(true); }} className="p-2 text-gray-600 hover:text-blue-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => handleDeleteReview(r)} disabled={deletingId === r.id} className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
              {activeTab === 'inspections' && (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Result</th>
                      {!selectedProjectId && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>}
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {inspections.length === 0 ? (
                      <tr>
                        <td colSpan={selectedProjectId ? 4 : 5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">No inspections.</td>
                      </tr>
                    ) : (
                      inspections.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.inspection_title || '—'}</td>
                          <td className="px-4 py-3 text-sm">{r.inspection_date || '—'}</td>
                          <td className="px-4 py-3 text-sm">{r.inspection_result || '—'}</td>
                          {!selectedProjectId && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{projectLabel(r)}</td>}
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => { setSelectedInspection(r); setShowInspectionForm(true); }} className="p-2 text-gray-600 hover:text-blue-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => handleDeleteInspection(r)} disabled={deletingId === r.id} className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {showRegisterForm && (
          <QualityRegisterForm
            item={selectedRegister}
            projectId={selectedProjectId || selectedRegister?.project_id}
            onSave={() => { setShowRegisterForm(false); setSelectedRegister(null); fetchAll(); }}
            onCancel={() => { setShowRegisterForm(false); setSelectedRegister(null); }}
          />
        )}
        {showReviewForm && (
          <QualityReviewForm
            review={selectedReview}
            projectId={selectedProjectId || selectedReview?.project_id}
            qualityRegisterId={selectedReview?.quality_register_id}
            onSave={() => { setShowReviewForm(false); setSelectedReview(null); fetchAll(); }}
            onCancel={() => { setShowReviewForm(false); setSelectedReview(null); }}
          />
        )}
        {showInspectionForm && (
          <QualityInspectionForm
            inspection={selectedInspection}
            projectId={selectedProjectId || selectedInspection?.project_id}
            qualityRegisterId={selectedInspection?.quality_register_id}
            onSave={() => { setShowInspectionForm(false); setSelectedInspection(null); fetchAll(); }}
            onCancel={() => { setShowInspectionForm(false); setSelectedInspection(null); }}
          />
        )}
      </div>
    </DocumentGovernanceProvider>
  );
}

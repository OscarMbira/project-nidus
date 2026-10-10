/**
 * Project Archive (taxonomy §3, Project Closure > Archive) — a PM-curated log of key documents
 * and records marked archived for long-term reference. Rules 40/41/44/61/38.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Plus, LayoutGrid, List as ListIcon, ArrowLeft, ExternalLink } from 'lucide-react';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable';
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal';
import { RowActionButton, ExportListMenu } from '@nidus/ui';
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';
import { ARCHIVE_CATEGORIES, listProjectArchiveItems, deleteProjectArchiveItem } from '../../services/projectArchiveService';

const CATEGORY_LABELS = Object.fromEntries(ARCHIVE_CATEGORIES.map((c) => [c.value, c.label]));

export default function ProjectArchiveListPage() {
  const navigate = useNavigate();
  const { projectId } = usePlatformProjectId();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useViewMode('project-archive', 'list');
  const { showSuccess, modal: successModal } = useSuccessModal();

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'archived_date', direction: 'desc' },
    storageKey: 'project-archive-sort',
  });

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setItems(await listProjectArchiveItems(projectId));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.title?.toLowerCase().includes(q) || i.notes?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const sortAccessors = useMemo(
    () => ({
      title: (r) => r.title || '',
      category: (r) => r.category || '',
      archived_date: (r) => r.archived_date || '',
    }),
    []
  );
  const sorted = sortedData(filtered, sortAccessors);

  const exportColumns = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'archived_date', label: 'Archived on' },
    { key: 'archived_by_label', label: 'Archived by' },
  ];

  const openView = (row) => navigate(`/platform/closure/archive/${row.id}`);
  const openEdit = (row) => navigate(`/platform/closure/archive/${row.id}/edit`);

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove "${row.title}" from the archive log?`)) return;
    await deleteProjectArchiveItem(row.id);
    showSuccess({ recordId: row.title, operation: 'deleted', message: `"${row.title}" was removed.` });
    load();
  };

  if (!projectId || loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading archive…</div>;
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Archive className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archive</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Key documents and records kept for long-term reference after closure.</p>
          </div>
        </div>
        <button onClick={() => navigate('/platform/closure/archive/create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Archive Item
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archive..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
          />
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="ProjectArchive" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Table view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nothing archived yet.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('title')} onSort={() => handleSort('title')} className="!normal-case whitespace-nowrap">Title</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('category')} onSort={() => handleSort('category')} className="!normal-case whitespace-nowrap">Category</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('archived_date')} onSort={() => handleSort('archived_date')} className="!normal-case whitespace-nowrap">Archived on</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Archived by</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {row.title}
                      {row.reference_url && (
                        <a href={row.reference_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-blue-600 dark:text-blue-400" title="Open reference">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{CATEGORY_LABELS[row.category] || row.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.archived_date || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.archived_by_label || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="view" label="View archive item" onClick={() => openView(row)} />
                        <RowActionButton variant="edit" label="Edit archive item" onClick={() => openEdit(row)} />
                        <RowActionButton variant="delete" label="Remove archive item" onClick={() => handleDelete(row)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((row) => (
              <div key={row.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{row.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{CATEGORY_LABELS[row.category] || row.category} · {row.archived_date}</div>
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="view" label="View archive item" onClick={() => openView(row)} />
                  <RowActionButton variant="edit" label="Edit archive item" onClick={() => openEdit(row)} />
                  <RowActionButton variant="delete" label="Remove archive item" onClick={() => handleDelete(row)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {successModal}
    </div>
  );
}

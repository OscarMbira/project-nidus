/**
 * Stage Gate Reviews – List
 * Route: /platform/stage-gates
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Flag, Eye, Edit2, Trash2 } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

const STATUS_COLORS = {
  draft: 'bg-gray-600 text-gray-100',
  pending: 'bg-yellow-700 text-yellow-100',
  approved: 'bg-green-700 text-green-100',
  rejected: 'bg-red-700 text-red-100',
};

export default function StageGateList() {
  const [records, setRecords]   = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await platformDb
        .from('stage_gate_reviews')
        .select('id, gate_name, project_id, stage, status, decision_date, created_at')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      setRecords(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter((r) =>
    [r.gate_name, r.stage, r.status].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async (id) => {
    if (!confirm('Delete this stage gate review?')) return;
    setDeleting(id);
    await platformDb.from('stage_gate_reviews').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id);
    setDeleting(null);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Flag size={22} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold">Stage Gate Reviews</h1>
            <p className="text-gray-400 text-sm">Formal go/no-go decision gates between project stages.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/platform/stage-gates/create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> New Stage Gate
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search stage gates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-10 text-center text-gray-400 text-sm">
          No stage gate reviews found. Create one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-left">
              <tr>
                {['#', 'Gate Name', 'Stage', 'Status', 'Decision Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-700/40">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{r.gate_name}</td>
                  <td className="px-4 py-3 text-gray-300">{r.stage ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-600 text-gray-100'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{r.decision_date ? new Date(r.decision_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/platform/stage-gates/${r.id}`)} className="text-blue-400 hover:text-blue-300"><Eye size={15} /></button>
                      <button onClick={() => navigate(`/platform/stage-gates/${r.id}/edit`)} className="text-yellow-400 hover:text-yellow-300"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id} className="text-red-400 hover:text-red-300 disabled:opacity-50"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

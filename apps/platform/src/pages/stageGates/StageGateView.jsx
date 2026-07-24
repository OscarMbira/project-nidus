/**
 * Stage Gate Reviews – View
 * Route: /platform/stage-gates/:id
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, Edit2, ArrowLeft } from 'lucide-react';
import { platformDb } from '@nidus/supabase';

const field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-gray-100 text-sm">{value ?? '—'}</p>
  </div>
);

export default function StageGateView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await platformDb.from('stage_gate_reviews').select('*').eq('id', id).maybeSingle();
      setRecord(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  if (!record) return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <p>Stage gate review not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <button onClick={() => navigate('/platform/stage-gates')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-5">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Flag size={22} className="text-blue-400" />
          <h1 className="text-2xl font-bold">{record.gate_name}</h1>
        </div>
        <button onClick={() => navigate(`/platform/stage-gates/${id}/edit`)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 text-sm hover:bg-gray-700">
          <Edit2 size={14} /> Edit
        </button>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 grid grid-cols-2 gap-5">
        {field({ label: 'Stage', value: record.stage })}
        {field({ label: 'Status', value: record.status })}
        {field({ label: 'Decision Date', value: record.decision_date ? new Date(record.decision_date).toLocaleDateString() : null })}
        {field({ label: 'Outcome', value: record.outcome })}
        <div className="col-span-2">
          {field({ label: 'Notes', value: record.notes })}
        </div>
        {field({ label: 'Created', value: new Date(record.created_at).toLocaleDateString() })}
      </div>
    </div>
  );
}

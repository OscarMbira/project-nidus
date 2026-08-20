/**
 * Stage Gate Reviews – View
 * Route: /platform/stage-gates/:id
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, ArrowLeft } from 'lucide-react';
import { RowActionButton } from '@nidus/ui';
import { platformDb } from '@nidus/supabase';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';

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
  const [projectName, setProjectName] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});

  useEffect(() => {
    async function load() {
      const { data } = await platformDb.from('stage_gate_reviews').select('*').eq('id', id).maybeSingle();
      setRecord(data);
      setLoading(false);
      if (data?.project_id) {
        const { data: proj } = await platformDb.from('projects').select('project_name').eq('id', data.project_id).maybeSingle();
        setProjectName(proj?.project_name ?? null);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'audit' || !record) return;
    let cancelled = false;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [record.created_by, record.updated_by]);
      if (!cancelled) setAuditUserLabels(labels || {});
    })();
    return () => { cancelled = true; };
  }, [activeTab, record]);

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
        <RowActionButton
          variant="edit"
          label="Edit stage gate"
          onClick={() => navigate(`/platform/stage-gates/${id}/edit`)}
        />
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'details' && (
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
      )}

      {activeTab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this stage gate review, and how it is classified.">
          <AuditCard title="Identity" description="How this stage gate review is labelled and tracked.">
            <AuditField label="Gate name" value={record.gate_name} />
            <AuditField label="Stage" value={record.stage} />
            <AuditField label="Status" value={humanizeAuditToken(record.status)} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this stage gate review sits.">
            <AuditField label="Project" value={projectName} />
          </AuditCard>
          <AuditCard title="Record history" description="When this stage gate review was created and last changed.">
            <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
            <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  );
}

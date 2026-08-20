/**
 * Policies & Compliance – View
 * Route: /platform/governance/policies/:id
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileCheck, ArrowLeft } from 'lucide-react';
import { RowActionButton } from '@nidus/ui';
import { platformDb } from '@nidus/supabase';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';

const F = ({label,value}) => <div><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p><p className="text-gray-100 text-sm whitespace-pre-wrap">{value??'—'}</p></div>;

export default function PoliciesComplianceView() {
  const {id}=useParams(); const navigate=useNavigate();
  const [r,setR]=useState(null); const [loading,setLoading]=useState(true);
  const [activeTab,setActiveTab]=useState('details');
  const [auditUserLabels,setAuditUserLabels]=useState({});
  useEffect(()=>{ platformDb.from('policies_compliance').select('*').eq('id',id).maybeSingle().then(({data})=>{setR(data);setLoading(false);}); },[id]);
  useEffect(() => {
    if (activeTab !== 'audit' || !r) return;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [r.created_by, r.updated_by]);
      setAuditUserLabels(labels);
    })();
  }, [activeTab, r]);
  if(loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>;
  if(!r) return <div className="min-h-screen bg-gray-900 text-gray-100 p-6">Policy not found.</div>;
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <button onClick={()=>navigate('/platform/governance/policies')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-5"><ArrowLeft size={15}/>Back</button>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><FileCheck size={22} className="text-blue-400"/><h1 className="text-2xl font-bold">{r.policy_name}</h1></div>
        <RowActionButton
          variant="edit"
          label="Edit policy"
          onClick={() => navigate(`/platform/governance/policies/${id}/edit`)}
        />
      </div>
      <div className="mb-4"><DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} /></div>
      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who created or changed this policy, and how it is classified.">
          <AuditCard title="Identity" description="How this policy is labelled and tracked.">
            <AuditField label="Policy name" value={r.policy_name} />
            <AuditField label="Status" value={humanizeAuditToken(r.status)} />
          </AuditCard>
          <AuditCard title="Classification" description="How this policy is categorised.">
            <AuditField label="Category" value={r.category} />
            <AuditField label="Compliance owner" value={r.compliance_owner} />
          </AuditCard>
          <AuditCard title="Record history" description="When this policy was created and last changed.">
            <AuditField label="Created by" value={r.created_by ? auditUserLabels[r.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={r.created_at} />
            <AuditField label="Updated by" value={r.updated_by ? auditUserLabels[r.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={r.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 grid grid-cols-2 gap-5">
        <F label="Category" value={r.category}/><F label="Status" value={r.status}/>
        <F label="Compliance Owner" value={r.compliance_owner}/>
        <F label="Review Date" value={r.review_date?new Date(r.review_date).toLocaleDateString():null}/>
        <div className="col-span-2"><F label="Description" value={r.description}/></div>
        <div className="col-span-2"><F label="Requirements" value={r.requirements}/></div>
        <div className="col-span-2"><F label="Notes" value={r.notes}/></div>
      </div>
      )}
    </div>
  );
}

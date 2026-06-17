/**
 * Policies & Compliance – List
 * Route: /platform/governance/policies
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileCheck, Eye, Edit2, Trash2 } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

const STATUS_BADGE = { draft:'bg-gray-600', active:'bg-green-700', archived:'bg-yellow-700' };

export default function PoliciesComplianceList() {
  const [records, setRecords] = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await platformDb.from('policies_compliance').select('id,policy_name,category,status,review_date,created_at').eq('is_deleted',false).order('created_at',{ascending:false});
    setRecords(data??[]);
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);
  const filtered = records.filter(r=>[r.policy_name,r.category].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  const del = async id => { if(!confirm('Delete this policy?')) return; await platformDb.from('policies_compliance').update({is_deleted:true,deleted_at:new Date().toISOString()}).eq('id',id); load(); };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><FileCheck size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">Policies & Compliance</h1><p className="text-gray-400 text-sm">Manage organisational policies and compliance records.</p></div></div>
        <button onClick={()=>navigate('/platform/governance/policies/create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"><Plus size={15}/>New Policy</button>
      </div>
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search policies…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading?<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/></div>
      :filtered.length===0?<div className="rounded-lg border border-gray-700 bg-gray-800 p-10 text-center text-gray-400 text-sm">No policies found. Create one to get started.</div>
      :(
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm"><thead className="bg-gray-800"><tr>{['#','Policy Name','Category','Status','Review Date','Actions'].map(h=><th key={h} className="px-4 py-3 text-gray-400 font-medium text-left">{h}</th>)}</tr></thead>
          <tbody>{filtered.map((r,i)=>(
            <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-700/40">
              <td className="px-4 py-3 text-gray-500">{i+1}</td>
              <td className="px-4 py-3 font-medium">{r.policy_name}</td>
              <td className="px-4 py-3 text-gray-300">{r.category??'—'}</td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${STATUS_BADGE[r.status]??'bg-gray-600'}`}>{r.status??'draft'}</span></td>
              <td className="px-4 py-3 text-gray-300">{r.review_date?new Date(r.review_date).toLocaleDateString():'—'}</td>
              <td className="px-4 py-3"><div className="flex gap-2">
                <button onClick={()=>navigate(`/platform/governance/policies/${r.id}`)} className="text-blue-400 hover:text-blue-300"><Eye size={15}/></button>
                <button onClick={()=>navigate(`/platform/governance/policies/${r.id}/edit`)} className="text-yellow-400 hover:text-yellow-300"><Edit2 size={15}/></button>
                <button onClick={()=>del(r.id)} className="text-red-400 hover:text-red-300"><Trash2 size={15}/></button>
              </div></td>
            </tr>
          ))}</tbody></table>
        </div>
      )}
    </div>
  );
}

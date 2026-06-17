/**
 * Certificate Administration
 * Route: /simulator/admin/certificates
 * simulator_admin only.
 */
import { useState, useEffect, useCallback } from 'react';
import { Award, Search, X, RefreshCw } from 'lucide-react';
import { simDb } from '../../../services/supabase/supabaseClient';

export default function CertificateAdmin() {
  const [certs,setCerts]=useState([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setLoading(true);
    const {data}=await simDb.from('certificates').select('id,user_id,certificate_code,issued_at,status,exam_name,score').eq('is_deleted',false).order('issued_at',{ascending:false}).limit(100);
    setCerts(data??[]); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtered=certs.filter(c=>[c.certificate_code,c.exam_name,c.status].some(v=>v?.toLowerCase().includes(search.toLowerCase())));

  const revoke=async id=>{ if(!confirm('Revoke this certificate?')) return; await simDb.from('certificates').update({status:'revoked',updated_at:new Date().toISOString()}).eq('id',id); load(); };
  const reissue=async id=>{ await simDb.from('certificates').update({status:'issued',updated_at:new Date().toISOString()}).eq('id',id); load(); };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6"><Award size={22} className="text-yellow-400"/><div><h1 className="text-2xl font-bold">Certificate Administration</h1><p className="text-gray-400 text-sm">View, revoke, and re-issue simulator certificates.</p></div></div>
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-100 text-sm focus:outline-none" placeholder="Search certificates…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {loading?<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"/></div>
      :filtered.length===0?<p className="text-gray-400 text-sm p-6">No certificates found.</p>
      :(
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm"><thead className="bg-gray-800"><tr>{['Code','Exam','Score','Status','Issued','Actions'].map(h=><th key={h} className="px-4 py-3 text-gray-400 font-medium text-left">{h}</th>)}</tr></thead>
          <tbody>{filtered.map(c=>(
            <tr key={c.id} className="border-t border-gray-700 hover:bg-gray-700/40">
              <td className="px-4 py-3 font-mono text-xs">{c.certificate_code}</td>
              <td className="px-4 py-3">{c.exam_name??'—'}</td>
              <td className="px-4 py-3">{c.score!=null?`${c.score}%`:'—'}</td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${c.status==='issued'?'bg-green-700 text-green-100':'bg-red-700 text-red-100'}`}>{c.status}</span></td>
              <td className="px-4 py-3 text-gray-300">{c.issued_at?new Date(c.issued_at).toLocaleDateString():'—'}</td>
              <td className="px-4 py-3"><div className="flex gap-2">
                {c.status==='issued'?<button onClick={()=>revoke(c.id)} title="Revoke" className="text-red-400 hover:text-red-300"><X size={14}/></button>
                :<button onClick={()=>reissue(c.id)} title="Re-issue" className="text-green-400 hover:text-green-300"><RefreshCw size={14}/></button>}
              </div></td>
            </tr>
          ))}</tbody></table>
        </div>
      )}
    </div>
  );
}

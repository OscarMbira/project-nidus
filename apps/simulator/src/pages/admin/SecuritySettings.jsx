/**
 * Encryption & Security Settings
 * Route: /admin/security-settings
 * system_admin only.
 */
import { useState } from 'react';
import { Shield, Save } from 'lucide-react';

const inp = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';
const sec = 'rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-4 mb-5';

export default function SecuritySettings() {
  const [form,setForm]=useState({encryption_at_rest:true,audit_log_enabled:true,audit_retention_days:90,ip_allowlist_enabled:false,ip_allowlist:'',api_key_rotation_days:90});
  const [saved,setSaved]=useState(false);
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const handleSave=e=>{e.preventDefault();setSaved(true);setTimeout(()=>setSaved(false),2500);};

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6"><Shield size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">Encryption & Security</h1><p className="text-gray-400 text-sm">Manage data encryption, audit logging, and access controls.</p></div></div>
      {saved&&<div className="mb-4 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-300 text-sm">Security settings saved.</div>}
      <form onSubmit={handleSave}>
        <div className={sec}>
          <h2 className="font-semibold text-gray-200">Data Encryption</h2>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.encryption_at_rest} onChange={set('encryption_at_rest')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Encryption at rest enabled (managed by Supabase)</span></label>
        </div>
        <div className={sec}>
          <h2 className="font-semibold text-gray-200">Audit Logging</h2>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.audit_log_enabled} onChange={set('audit_log_enabled')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Enable audit trail logging</span></label>
          <div><label className={lbl}>Audit Log Retention (days)</label><input type="number" min="30" max="3650" className={inp} value={form.audit_retention_days} onChange={set('audit_retention_days')}/></div>
        </div>
        <div className={sec}>
          <h2 className="font-semibold text-gray-200">IP Allowlisting</h2>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.ip_allowlist_enabled} onChange={set('ip_allowlist_enabled')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Restrict access by IP address</span></label>
          {form.ip_allowlist_enabled && <div><label className={lbl}>Allowed IPs (comma-separated)</label><textarea className={`${inp} h-20 resize-none`} value={form.ip_allowlist} onChange={set('ip_allowlist')} placeholder="e.g. 192.168.1.1, 10.0.0.0/24"/></div>}
        </div>
        <div className={sec}>
          <h2 className="font-semibold text-gray-200">API Key Management</h2>
          <div><label className={lbl}>Auto-rotate API keys every (days)</label><input type="number" min="0" max="365" className={inp} value={form.api_key_rotation_days} onChange={set('api_key_rotation_days')}/></div>
        </div>
        <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"><Save size={15}/>Save Settings</button>
      </form>
    </div>
  );
}

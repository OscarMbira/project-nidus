/**
 * Authentication Settings
 * Route: /admin/authentication-settings
 * system_admin only.
 */
import { useState } from 'react';
import { Lock, Save } from 'lucide-react';

const inp = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';
const section = 'rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-4 mb-5';

export default function AuthenticationSettings() {
  const [form, setForm] = useState({ mfa_enabled: false, session_timeout_minutes: 60, password_min_length: 8, password_require_uppercase: true, password_require_numbers: true, sso_enabled: false, sso_provider: '' });
  const [saved, setSaved] = useState(false);
  const set = f => e => setForm(p=>({...p,[f]: e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const handleSave = e => { e.preventDefault(); setSaved(true); setTimeout(()=>setSaved(false),2500); };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6"><Lock size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">Authentication Settings</h1><p className="text-gray-400 text-sm">Configure MFA, session, password, and SSO settings.</p></div></div>
      {saved && <div className="mb-4 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-300 text-sm">Settings saved.</div>}
      <form onSubmit={handleSave}>
        <div className={section}>
          <h2 className="font-semibold text-gray-200">Multi-Factor Authentication</h2>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.mfa_enabled} onChange={set('mfa_enabled')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Enable MFA for all users</span></label>
        </div>
        <div className={section}>
          <h2 className="font-semibold text-gray-200">Session</h2>
          <div><label className={lbl}>Session Timeout (minutes)</label><input type="number" min="5" max="1440" className={inp} value={form.session_timeout_minutes} onChange={set('session_timeout_minutes')}/></div>
        </div>
        <div className={section}>
          <h2 className="font-semibold text-gray-200">Password Policy</h2>
          <div><label className={lbl}>Minimum Password Length</label><input type="number" min="6" max="32" className={inp} value={form.password_min_length} onChange={set('password_min_length')}/></div>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.password_require_uppercase} onChange={set('password_require_uppercase')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Require uppercase letter</span></label>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.password_require_numbers} onChange={set('password_require_numbers')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Require numbers</span></label>
        </div>
        <div className={section}>
          <h2 className="font-semibold text-gray-200">Single Sign-On (SSO)</h2>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.sso_enabled} onChange={set('sso_enabled')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Enable SSO</span></label>
          {form.sso_enabled && <div><label className={lbl}>SSO Provider</label><input className={inp} value={form.sso_provider} onChange={set('sso_provider')} placeholder="e.g. Google, Azure AD, Okta"/></div>}
        </div>
        <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"><Save size={15}/>Save Settings</button>
      </form>
    </div>
  );
}

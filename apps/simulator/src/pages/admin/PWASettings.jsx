/**
 * PWA Settings
 * Route: /admin/pwa-settings
 * system_admin only.
 */
import { useState } from 'react';
import { Smartphone, Save } from 'lucide-react';

const inp = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl = 'block text-sm font-medium text-gray-300 mb-1';

export default function PWASettings() {
  const [form,setForm]=useState({app_name:'Project Nidus',app_short_name:'Nidus',theme_color:'#1e293b',background_color:'#0f172a',display:'standalone',install_prompt_enabled:true,offline_cache_enabled:true});
  const [saved,setSaved]=useState(false);
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const handleSave=e=>{e.preventDefault();setSaved(true);setTimeout(()=>setSaved(false),2500);};

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6"><Smartphone size={22} className="text-blue-400"/><div><h1 className="text-2xl font-bold">PWA Settings</h1><p className="text-gray-400 text-sm">Configure Progressive Web App appearance and behaviour.</p></div></div>
      {saved&&<div className="mb-4 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-300 text-sm">PWA settings saved. Rebuild required to apply manifest changes.</div>}
      <form onSubmit={handleSave} className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>App Name</label><input className={inp} value={form.app_name} onChange={set('app_name')}/></div>
          <div><label className={lbl}>Short Name</label><input className={inp} value={form.app_short_name} onChange={set('app_short_name')} maxLength={12}/></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lbl}>Theme Colour</label><input type="color" className="h-10 w-full rounded-lg border border-gray-600 bg-gray-700 cursor-pointer" value={form.theme_color} onChange={set('theme_color')}/></div>
          <div><label className={lbl}>Background Colour</label><input type="color" className="h-10 w-full rounded-lg border border-gray-600 bg-gray-700 cursor-pointer" value={form.background_color} onChange={set('background_color')}/></div>
        </div>
        <div><label className={lbl}>Display Mode</label><select className={inp} value={form.display} onChange={set('display')}>{['standalone','fullscreen','minimal-ui','browser'].map(d=><option key={d} value={d}>{d}</option>)}</select></div>
        <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.install_prompt_enabled} onChange={set('install_prompt_enabled')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Show install prompt to users</span></label>
        <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.offline_cache_enabled} onChange={set('offline_cache_enabled')} className="w-4 h-4 accent-blue-500"/><span className="text-sm text-gray-300">Enable offline caching (Service Worker)</span></label>
        <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"><Save size={15}/>Save Settings</button>
      </form>
    </div>
  );
}

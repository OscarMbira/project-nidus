/**
 * Organisation Profile
 * Edit org name, contact details, industry, country.
 * Route: /platform/organisation/profile
 */

import { useState, useEffect } from 'react';
import { Save, Building2 } from 'lucide-react';
import { platformDb } from '@nidus/supabase';
import { useNavigate } from 'react-router-dom';

const input = 'w-full rounded-lg border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const label = 'block text-sm font-medium text-gray-300 mb-1';
const card  = 'rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-sm';

export default function OrganisationProfile() {
  const [form, setForm]       = useState({ name: '', contact_email: '', phone: '', industry: '', country_id: '' });
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [accountId, setAccountId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await platformDb.auth.getUser();
        if (!user) { navigate('/auth/login'); return; }

        const [{ data: acct }, { data: ctries }] = await Promise.all([
          platformDb.from('accounts').select('id, name, contact_email, phone, industry, country_id').eq('auth_user_id', user.id).maybeSingle(),
          platformDb.from('countries').select('id, country_name').eq('is_active', true).order('country_name'),
        ]);

        if (acct) {
          setAccountId(acct.id);
          setForm({ name: acct.name ?? '', contact_email: acct.contact_email ?? '', phone: acct.phone ?? '', industry: acct.industry ?? '', country_id: acct.country_id ?? '' });
        }
        setCountries(ctries ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!accountId) return;
    setSaving(true);
    try {
      await platformDb.from('accounts').update({ ...form, updated_at: new Date().toISOString() }).eq('id', accountId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Building2 size={24} className="text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold">Organisation Profile</h1>
          <p className="text-gray-400 text-sm">Update your organisation's details.</p>
        </div>
      </div>

      {saved && (
        <div className="mb-4 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-300 text-sm">
          Organisation profile saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className={card}>
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className={label}>Organisation Name <span className="text-red-400">*</span></label>
            <input className={input} value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className={label}>Contact Email</label>
            <input className={input} type="email" value={form.contact_email} onChange={set('contact_email')} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className={label}>Industry</label>
            <input className={input} value={form.industry} onChange={set('industry')} placeholder="e.g. Technology, Finance, Healthcare" />
          </div>
          <div>
            <label className={label}>Country</label>
            <select className={input} value={form.country_id} onChange={set('country_id')}>
              <option value="">— Select country —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.country_name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={15} /> {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

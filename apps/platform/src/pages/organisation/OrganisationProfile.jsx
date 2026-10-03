/**
 * Organisation Profile
 * Edit org name, contact details, industry, country.
 * Route: /platform/organisation/profile
 */

import { useState, useEffect } from 'react';
import { Save, Building2 } from 'lucide-react';
import { platformDb } from '@nidus/supabase';
import { useNavigate } from 'react-router-dom';
import SelectField from '@nidus/ui/SelectField';

const input = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const label = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
const card  = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm';

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
      await platformDb.from('accounts').update({
        name: form.name,
        contact_email: form.contact_email,
        phone: form.phone,
        industry: form.industry,
        country_id: form.country_id || null,
      }).eq('id', accountId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const countryOptions = countries.map((c) => ({ value: c.id, label: c.country_name }));

  if (loading) return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex items-center justify-center text-gray-500 dark:text-gray-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold">Organisation Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Update your organisation&apos;s details.</p>
        </div>
      </div>

      {saved && (
        <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 px-4 py-3 text-green-800 dark:text-green-300 text-sm">
          Organisation profile saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className={card}>
        <div className="space-y-4">
          <div>
            <label className={label}>Organisation Name</label>
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
            <SelectField
              options={countryOptions}
              value={form.country_id}
              onChange={(v) => setForm((f) => ({ ...f, country_id: v }))}
              placeholder="— Select country —"
              searchPlaceholder="Search country..."
              forceSearchable
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={15} /> {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

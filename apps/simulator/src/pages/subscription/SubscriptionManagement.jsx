/**
 * Subscription & Billing Management
 * Route: /platform/subscription
 * Tabs: Plan | Billing History | Payment Methods
 */

import { useState, useEffect } from 'react';
import { CreditCard, ArrowUpCircle, FileText, CheckCircle } from 'lucide-react';
import { platformDb } from '@nidus/supabase';
import { useNavigate } from 'react-router-dom';
import BillingAccessGate from '../../components/billing/BillingAccessGate';
import { resolveBillingAccess } from '../../services/billingAccessService';

const TABS = [
  { id: 'plan',    label: 'Current Plan',     icon: CheckCircle },
  { id: 'billing', label: 'Billing History',  icon: FileText },
  { id: 'payment', label: 'Payment Methods',  icon: CreditCard },
];

const card = 'rounded-lg border border-gray-700 bg-gray-800 p-5 shadow-sm';

export default function SubscriptionManagement() {
  const [tab, setTab]         = useState('plan');
  const [plan, setPlan]       = useState(null);
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await platformDb.auth.getUser();
        if (!user) { navigate('/platform/login'); return; }

        const access = await resolveBillingAccess(user.id);
        if (!access.hasBillingAccess) return;

        const { data: userRow } = await platformDb
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        let acct = null;
        if (access.accountId) {
          const { data } = await platformDb
            .from('accounts')
            .select('subscription_plan, subscription_status, trial_ends_at, billing_email')
            .eq('id', access.accountId)
            .maybeSingle();
          acct = data;
        }
        setPlan(acct);

        const { data: txns } = await platformDb
          .from('payment_transactions')
          .select('id, amount, currency, status, created_at, description')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(20);
        setBilling(txns ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  return (
    <BillingAccessGate>
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-1">Subscription & Billing</h1>
      <p className="text-gray-400 text-sm mb-6">Manage your plan, billing history and payment methods.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          {/* Current Plan tab */}
          {tab === 'plan' && (
            <div className={card}>
              <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
              {plan ? (
                <div className="space-y-3 text-sm">
                  <p><span className="text-gray-400">Plan:</span> <span className="font-medium capitalize">{plan.subscription_plan ?? 'Trial'}</span></p>
                  <p><span className="text-gray-400">Status:</span> <span className="font-medium capitalize">{plan.subscription_status ?? 'Active'}</span></p>
                  {plan.trial_ends_at && (
                    <p><span className="text-gray-400">Trial ends:</span> {new Date(plan.trial_ends_at).toLocaleDateString()}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No plan information found.</p>
              )}
              <button
                onClick={() => navigate('/platform/subscription/upgrade')}
                className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowUpCircle size={15} /> Upgrade / Downgrade Plan
              </button>
            </div>
          )}

          {/* Billing History tab */}
          {tab === 'billing' && (
            <div className={card}>
              <h2 className="text-lg font-semibold mb-4">Billing History</h2>
              {billing.length === 0 ? (
                <p className="text-gray-400 text-sm">No transactions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-700">
                        <th className="pb-2">#</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.map((tx, i) => (
                        <tr key={tx.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 text-gray-500">{i + 1}</td>
                          <td className="py-2">{new Date(tx.created_at).toLocaleDateString()}</td>
                          <td className="py-2">{tx.description ?? '—'}</td>
                          <td className="py-2">{tx.currency} {tx.amount}</td>
                          <td className="py-2 capitalize">{tx.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payment Methods tab */}
          {tab === 'payment' && (
            <div className={card}>
              <h2 className="text-lg font-semibold mb-4">Payment Methods</h2>
              <p className="text-gray-400 text-sm">
                Payment methods are managed through Paynow. Visit the Paynow portal to add or update your payment details.
              </p>
              <button
                className="mt-4 px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                onClick={() => navigate('/platform/subscription/upgrade')}
              >
                Manage via Paynow
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </BillingAccessGate>
  );
}

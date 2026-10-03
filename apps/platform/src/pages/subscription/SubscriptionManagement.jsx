/**
 * Subscription & Billing Management
 * Route: /platform/subscription
 * Tabs: Plan | Billing History | Payment Methods
 */

import { useState, useEffect } from 'react';
import { CreditCard, ArrowUpCircle, FileText, CheckCircle, UserPlus } from 'lucide-react';
import { platformDb } from '@nidus/supabase';
import { useNavigate } from 'react-router-dom';
import CancellationReasonModal from '@nidus/shared/components/subscription/CancellationReasonModal';
import BillingAccessGate from '../../components/billing/BillingAccessGate';
import { resolveBillingAccess } from '../../services/billingAccessService';
import { getUserSystemRoles } from '../../services/roleService';
import {
  cancelPlatformSubscription,
  getPlatformSubscription,
} from '../../services/platformSubscriptionService';

const TABS = [
  { id: 'plan',    label: 'Current Plan',     icon: CheckCircle },
  { id: 'billing', label: 'Billing History',  icon: FileText },
  { id: 'payment', label: 'Payment Methods',  icon: CreditCard },
];

const card = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm';

export default function SubscriptionManagement() {
  const [tab, setTab]         = useState('plan');
  const [plan, setPlan]       = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // v982 Phase 1 (task F): Account Owner who declined PMO Admin at registration (or hasn't
  // self-granted it since) sees a CTA to invite one, on the zone this plan's "declined-PMO
  // landing" redirect points to.
  const [showInvitePmoCta, setShowInvitePmoCta] = useState(false);
  const navigate = useNavigate();

  const loadSubscriptionData = async (userId) => {
    const sub = await getPlatformSubscription(userId);
    setSubscription(sub);
    return sub;
  };

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await platformDb.auth.getUser();
        if (!user) { navigate('/platform/login'); return; }
        setAuthUserId(user.id);

        const access = await resolveBillingAccess(user.id);

        // isOwner is independent of hasBillingAccess (a delegate can have billing access
        // without being the owner) — check regardless so the CTA is scoped to the actual
        // Account Owner, never a billing delegate.
        if (access.isOwner) {
          const systemRoles = await getUserSystemRoles(user.id);
          const hasPmoAdmin = systemRoles.success
            && systemRoles.data.some((r) => r.roles?.role_name === 'pmo_admin');
          setShowInvitePmoCta(!hasPmoAdmin);
        }

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

        await loadSubscriptionData(user.id);

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

  const proceedCancel = async (_reasonId, notes) => {
    if (!subscription?.id) return;
    setCancelling(true);
    try {
      await cancelPlatformSubscription(subscription.id, notes || null);
      if (authUserId) await loadSubscriptionData(authUserId);
      setShowCancelModal(false);
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = subscription
    && !subscription.is_lifetime
    && !subscription.cancel_at_period_end
    && ['active', 'trialing'].includes(String(subscription.status || '').toLowerCase());

  return (
    <BillingAccessGate>
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-1">Subscription & Billing</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Manage your plan, billing history and payment methods.</p>

      {showInvitePmoCta && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              No one has PMO Admin access yet
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              PMO Admin configures industries, roles, and menu access for your organisation. Invite someone
              into that role, or grant it to yourself from Organisation Settings at any time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/send-role-invites')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
          >
            <UserPlus size={15} /> Invite a PMO Administrator
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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
                  <p><span className="text-gray-500 dark:text-gray-400">Plan:</span> <span className="font-medium capitalize">{plan.subscription_plan ?? 'Trial'}</span></p>
                  <p><span className="text-gray-500 dark:text-gray-400">Status:</span> <span className="font-medium capitalize">{plan.subscription_status ?? 'Active'}</span></p>
                  {plan.trial_ends_at && (
                    <p><span className="text-gray-500 dark:text-gray-400">Trial ends:</span> {new Date(plan.trial_ends_at).toLocaleDateString()}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No plan information found.</p>
              )}
              {subscription?.cancel_at_period_end && (
                <p className="mt-4 text-sm text-amber-600 dark:text-amber-300">
                  Your subscription is scheduled to cancel at the end of the current billing period.
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/platform/subscription/upgrade')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <ArrowUpCircle size={15} /> Upgrade / Downgrade Plan
                </button>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    disabled={cancelling}
                    className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Billing History tab */}
          {tab === 'billing' && (
            <div className={card}>
              <h2 className="text-lg font-semibold mb-4">Billing History</h2>
              {billing.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No transactions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-2">#</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.map((tx, i) => (
                        <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">
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

      <CancellationReasonModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={proceedCancel}
        targetSystem="platform"
        subscriptionId={subscription?.id ?? null}
      />
    </div>
    </BillingAccessGate>
  );
}

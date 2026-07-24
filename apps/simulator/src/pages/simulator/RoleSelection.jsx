import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { SIMULATOR_ROLE_LIST, canAccessRoleForTier } from '@nidus/shared/constants/simulatorRoles';
import { simDb } from '../../services/supabase/supabaseClient';
import { savePreferredRole, getPreferredRole } from '../../services/sim/rolePreferenceService';
import { getSubscriptionStatusSummary } from '../../services/subscriptionStatusService';
import RoleUpgradePrompt from '../../components/sim/RoleUpgradePrompt';
import {
  Briefcase, Layers, PieChart, ShieldCheck, ClipboardList, Lock,
} from 'lucide-react';

const ICONS = {
  Briefcase,
  Layers,
  PieChart,
  ShieldCheck,
  ClipboardList,
};

const COLOR_MAP = {
  purple: 'from-purple-500 to-violet-600',
  orange: 'from-orange-500 to-red-600',
  indigo: 'from-indigo-500 to-blue-600',
  teal: 'from-teal-500 to-cyan-600',
  green: 'from-green-500 to-emerald-600',
};

export default function RoleSelection() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [tier, setTier] = useState('free');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await simDb.auth.getUser();
      if (user) {
        const stored = await getPreferredRole(user.id);
        if (stored) setSelectedRole(stored);
        const summary = await getSubscriptionStatusSummary(user.id);
        setTier(summary?.tier || summary?.planTier || 'free');
      }
    })();
  }, []);

  const handleContinue = async () => {
    if (!selectedRole || !canAccessRoleForTier(selectedRole, tier)) return;
    setSaving(true);
    try {
      const { data: { user } } = await simDb.auth.getUser();
      const path = await savePreferredRole(user?.id, selectedRole);
      navigate(path);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">Choose Your Practice Role</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Select one of five project management roles. Your choice shapes your dashboard, scenarios, learning path, and scoring.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {SIMULATOR_ROLE_LIST.map((role) => {
            const Icon = ICONS[role.icon] || Briefcase;
            const locked = !canAccessRoleForTier(role.id, tier);
            const selected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`text-left rounded-xl border p-5 transition-all ${
                  selected
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                } bg-white dark:bg-gray-800`}
              >
                <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${COLOR_MAP[role.color] || COLOR_MAP.purple} text-white mb-3`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{role.label}</h3>
                  {locked && <Lock className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{role.level}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {role.id === 'project_coordinator' && 'Scheduling, documentation, and stakeholder coordination.'}
                  {role.id === 'pmo_analyst' && 'Governance, compliance, reporting, and standards.'}
                  {role.id === 'project_manager' && 'End-to-end project delivery and control.'}
                  {role.id === 'programme_manager' && 'Multi-project coordination and benefits.'}
                  {role.id === 'portfolio_manager' && 'Strategic prioritisation and investment balancing.'}
                </p>
              </button>
            );
          })}
        </div>

        {selectedRole && !canAccessRoleForTier(selectedRole, tier) && (
          <div className="mb-6"><RoleUpgradePrompt roleId={selectedRole} currentTier={tier} /></div>
        )}

        <div className="flex justify-center">
          <button
            type="button"
            disabled={!selectedRole || !canAccessRoleForTier(selectedRole, tier) || saving}
            onClick={handleContinue}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
          >
            {saving ? 'Saving…' : 'Enter Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

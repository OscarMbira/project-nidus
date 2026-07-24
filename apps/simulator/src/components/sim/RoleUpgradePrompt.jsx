import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { getSimulatorRoleById } from '@nidus/shared/constants/simulatorRoles';

export default function RoleUpgradePrompt({ roleId, currentTier = 'free' }) {
  const role = getSimulatorRoleById(roleId);
  if (!role) return null;

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 text-center max-w-md mx-auto">
      <Lock className="h-10 w-10 text-amber-600 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{role.label} is locked</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        Upgrade from <strong>{currentTier}</strong> to <strong>{role.requiredTier}</strong> or above to practice as a {role.label}.
      </p>
      <Link
        to="/simulator/subscription"
        className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
      >
        View plans
      </Link>
    </div>
  );
}

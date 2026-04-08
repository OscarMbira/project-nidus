/**
 * Stakeholders On Hold – draft queue for stakeholder form.
 * Lists saved drafts; Resume opens the form with draft data.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { EntityHoldQueue } from '../../components/ui/EntityHoldQueue';

export function StakeholdersOnHold() {
  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/platform/stakeholders/register"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Stakeholders On Hold</h1>
                <p className="text-gray-400 mt-1">
                  Resume or manage your saved stakeholder drafts
                </p>
              </div>
            </div>
            <Link
              to="/platform/stakeholders/register/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Stakeholder</span>
            </Link>
          </div>
        </div>
        <EntityHoldQueue
          entityType="stakeholder"
          showSearch={true}
          showFilters={true}
          showLimitMeter={true}
        />
      </div>
    </div>
  );
}

export default StakeholdersOnHold;

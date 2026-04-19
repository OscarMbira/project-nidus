/**
 * ProjectsOnHold Page
 *
 * Displays projects that have been put on hold.
 * Uses the EntityHoldQueue component for consistent UI.
 *
 * @version v201
 * @created 2026-01-31
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { EntityHoldQueue } from '../../components/ui/EntityHoldQueue';

export function ProjectsOnHold() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/app/projects"
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Projects On Hold</h1>
                <p className="text-gray-400 mt-1">
                  Resume or manage your saved project drafts
                </p>
              </div>
            </div>
            <Link
              to="/app/projects/create"
              className="inline-flex items-center gap-2 px-4 py-2
                bg-blue-600 hover:bg-blue-700
                text-white font-medium rounded-lg
                transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </Link>
          </div>
        </div>

        {/* Hold Queue */}
        <EntityHoldQueue
          entityType="project"
          showSearch={true}
          showFilters={true}
          showLimitMeter={true}
        />
      </div>
    </div>
  );
}

export default ProjectsOnHold;

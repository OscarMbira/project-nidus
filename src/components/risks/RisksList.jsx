/**
 * Risks List Component
 * List of risks with filters
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import RiskCard from './RiskCard';

export default function RisksList({ 
  risks = [], 
  loading = false, 
  onEdit, 
  onDelete, 
  onEscalate,
  emptyMessage = 'No risks found'
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!risks || risks.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {risks.map((risk) => (
        <RiskCard
          key={risk.id}
          risk={risk}
          onEdit={onEdit}
          onDelete={onDelete}
          onEscalate={onEscalate}
        />
      ))}
    </div>
  );
}

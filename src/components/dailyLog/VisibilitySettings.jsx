/**
 * Visibility Settings Component
 * Control daily log visibility
 */

import { useState } from 'react';
import { Eye, EyeOff, Users, Shield, Globe } from 'lucide-react';
import { updateDailyLogVisibility } from '../../services/dailyLogService';

export default function VisibilitySettings({ logId, currentVisibility, onUpdate }) {
  const [saving, setSaving] = useState(false);

  const visibilityOptions = [
    {
      value: 'private',
      label: 'Private',
      description: 'Only you (Project Manager) can view',
      icon: EyeOff,
      color: 'text-gray-600'
    },
    {
      value: 'team',
      label: 'Team',
      description: 'All project team members can view',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      value: 'stakeholders',
      label: 'Stakeholders',
      description: 'Team members and stakeholders can view',
      icon: Shield,
      color: 'text-purple-600'
    },
    {
      value: 'public',
      label: 'Public',
      description: 'Anyone with project access can view',
      icon: Globe,
      color: 'text-green-600'
    }
  ];

  const handleChange = async (newVisibility) => {
    if (newVisibility === currentVisibility) return;

    try {
      setSaving(true);
      const result = await updateDailyLogVisibility(logId, newVisibility);
      if (result.success) {
        if (onUpdate) {
          onUpdate(newVisibility);
        }
      } else {
        alert('Error updating visibility: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert('Error updating visibility: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Eye className="w-4 h-4" />
        Visibility Settings
      </h4>
      <div className="space-y-2">
        {visibilityOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = currentVisibility === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => handleChange(option.value)}
              disabled={saving}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? option.color : 'text-gray-400'}`} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {saving && (
        <p className="text-xs text-gray-500">Saving...</p>
      )}
    </div>
  );
}

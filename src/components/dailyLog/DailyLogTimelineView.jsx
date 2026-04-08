/**
 * Daily Log Timeline View Component
 * Timeline visualization of daily log entries
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, User, Tag, AlertCircle } from 'lucide-react';
import { getEntries } from '../../services/dailyLogEntryService';
import EntryTypeBadge from './EntryTypeBadge';
import EntryStatusBadge from './EntryStatusBadge';
import OverdueIndicator from './OverdueIndicator';

export default function DailyLogTimelineView({ logId, onEntryClick }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('date'); // 'date' or 'type'

  useEffect(() => {
    if (logId) {
      fetchEntries();
    }
  }, [logId]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const result = await getEntries(logId, {});
      if (result.success) {
        // Sort by date descending (newest first)
        const sorted = (result.data || []).sort((a, b) => {
          return new Date(b.entry_date) - new Date(a.entry_date);
        });
        setEntries(sorted);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupEntriesByDate = () => {
    const grouped = {};
    entries.forEach(entry => {
      const date = format(new Date(entry.entry_date), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });
    return grouped;
  };

  const groupEntriesByType = () => {
    const grouped = {};
    entries.forEach(entry => {
      const type = entry.entry_type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(entry);
    });
    return grouped;
  };

  const getGroupedEntries = () => {
    if (groupBy === 'date') {
      return groupEntriesByDate();
    } else {
      return groupEntriesByType();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading timeline...</div>;
  }

  const grouped = getGroupedEntries();
  const groups = Object.keys(grouped).sort((a, b) => {
    if (groupBy === 'date') {
      return new Date(b) - new Date(a);
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {/* Group By Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Group by:</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="date">Date</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {groups.map((groupKey) => {
          const groupEntries = grouped[groupKey];
          
          return (
            <div key={groupKey} className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

              {/* Group Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative z-10 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {groupBy === 'date' 
                      ? format(new Date(groupKey), 'MMMM d, yyyy')
                      : groupKey.charAt(0).toUpperCase() + groupKey.slice(1)
                    }
                  </h3>
                  <p className="text-sm text-gray-500">{groupEntries.length} entr{groupEntries.length !== 1 ? 'ies' : 'y'}</p>
                </div>
              </div>

              {/* Entries */}
              <div className="ml-12 space-y-4">
                {groupEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    onClick={() => onEntryClick && onEntryClick(entry)}
                    className="bg-white rounded-lg shadow p-4 hover:shadow-md cursor-pointer transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-500">#{entry.entry_number}</span>
                        <EntryTypeBadge type={entry.entry_type} />
                        <EntryStatusBadge status={entry.status} />
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(entry.created_at), 'h:mm a')}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3 line-clamp-2">{entry.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {entry.person_responsible && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {entry.person_responsible.full_name || entry.person_responsible_name}
                        </div>
                      )}
                      {entry.target_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(entry.target_date), 'MMM d, yyyy')}
                        </div>
                      )}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {entry.tags.length} tag{entry.tags.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    {entry.target_date && (
                      <div className="mt-2">
                        <OverdueIndicator targetDate={entry.target_date} status={entry.status} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No entries found
        </div>
      )}
    </div>
  );
}

/**
 * Daily Log Calendar View Component
 * Calendar view of daily log entries
 */

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format, isSameDay } from 'date-fns';
import 'react-calendar/dist/Calendar.css';
import { getEntries } from '../../services/dailyLogEntryService';
import EntryTypeBadge from './EntryTypeBadge';

export default function DailyLogCalendarView({ logId, onDateClick, onEntryClick }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
        setEntries(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntriesForDate = (date) => {
    return entries.filter(entry => {
      if (!entry.entry_date) return false;
      return isSameDay(new Date(entry.entry_date), date);
    });
  };

  const getTypeColor = (type) => {
    const colors = {
      problem: 'bg-red-500',
      action: 'bg-blue-500',
      event: 'bg-green-500',
      comment: 'bg-gray-500',
      observation: 'bg-yellow-500',
      decision: 'bg-purple-500',
      other: 'bg-indigo-500'
    };
    return colors[type] || colors.other;
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayEntries = getEntriesForDate(date);
      if (dayEntries.length === 0) return null;

      return (
        <div className="flex flex-wrap gap-1 justify-center mt-1">
          {dayEntries.slice(0, 3).map((entry) => (
            <div
              key={entry.id}
              className={`w-2 h-2 rounded-full ${getTypeColor(entry.entry_type)}`}
              title={`${entry.entry_type}: ${entry.description.substring(0, 50)}`}
            />
          ))}
          {dayEntries.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">+{dayEntries.length - 3}</span>
          )}
        </div>
      );
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dayEntries = getEntriesForDate(date);
      if (dayEntries.length > 0) {
        return 'has-entries';
      }
    }
    return null;
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (onDateClick) {
      onDateClick(date);
    }
  };

  const selectedDateEntries = getEntriesForDate(selectedDate);

  if (loading) {
    return <div className="text-center py-8 text-gray-900 dark:text-gray-100">Loading calendar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName}
          className="w-full dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {selectedDateEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Entries for {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          <div className="space-y-3">
            {selectedDateEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onEntryClick && onEntryClick(entry)}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <EntryTypeBadge type={entry.entry_type} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">#{entry.entry_number}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{entry.description}</p>
                {entry.target_date && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Target: {format(new Date(entry.target_date), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
          background: transparent;
        }
        .react-calendar__navigation button {
          color: inherit;
        }
        .react-calendar__month-view__weekdays {
          color: inherit;
        }
        .react-calendar__tile {
          color: inherit;
        }
        .react-calendar__tile.has-entries {
          background-color: #f3f4f6;
        }
        .dark .react-calendar__tile.has-entries {
          background-color: #374151;
        }
        .react-calendar__tile--active {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        .react-calendar__tile--now {
          background-color: #dbeafe;
        }
        .dark .react-calendar__tile--now {
          background-color: #1e3a5f;
        }
        .dark .react-calendar__navigation button:enabled:hover,
        .dark .react-calendar__navigation button:enabled:focus,
        .dark .react-calendar__tile:enabled:hover,
        .dark .react-calendar__tile:enabled:focus {
          background-color: #4b5563;
        }
      `}</style>
    </div>
  );
}

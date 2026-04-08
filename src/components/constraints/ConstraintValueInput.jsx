/**
 * Constraint Value Input Component
 * Dynamic input based on constraint category type
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { SmartAmountInput } from '../ui/SmartAmountInput';

export default function ConstraintValueInput({
  category,
  operand,
  value,
  valueMin,
  valueMax,
  unit,
  onChange,
  disabled = false
}) {
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const unitRef = useRef(null);

  // Close unit dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (unitRef.current && !unitRef.current.contains(event.target)) {
        setUnitDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!category) {
    return (
      <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 text-sm">
        Select a category first
      </div>
    );
  }

  const { value_type, unit_options, dropdown_options } = category;

  // Handle numeric input with unit selection
  const renderNumericInput = () => {
    const isBetween = operand === 'between';
    const units = unit_options || [];

    return (
      <div className="flex items-center gap-2 flex-1">
        {/* Unit selector (if available) */}
        {units.length > 0 && (
          <div ref={unitRef} className="relative">
            <button
              type="button"
              onClick={() => !disabled && setUnitDropdownOpen(!unitDropdownOpen)}
              disabled={disabled}
              className={`flex items-center gap-1 px-2 py-2 border rounded-lg min-w-[60px] justify-between
                ${disabled
                  ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
                  : 'bg-white dark:bg-gray-800 hover:border-blue-500 cursor-pointer'
                }
                ${unitDropdownOpen
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-gray-300 dark:border-gray-600'
                }`}
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {unit || units[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>

            {unitDropdownOpen && (
              <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                {units.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      onChange({ unit: u });
                      setUnitDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700
                      ${unit === u ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Value input(s) */}
        {isBetween ? (
          <div className="flex items-center gap-2 flex-1">
            <SmartAmountInput
              value={valueMin}
              onChange={(val) => onChange({ value_min: val })}
              placeholder="Min (e.g., 10k)"
              disabled={disabled}
              className="flex-1"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <SmartAmountInput
              value={valueMax}
              onChange={(val) => onChange({ value_max: val })}
              placeholder="Max (e.g., 50k)"
              disabled={disabled}
              className="flex-1"
            />
          </div>
        ) : (
          <SmartAmountInput
            value={value}
            onChange={(val) => onChange({ value_numeric: val })}
            placeholder="Value (e.g., 25k)"
            disabled={disabled}
            className="flex-1"
          />
        )}
      </div>
    );
  };

  // Handle text input (same height as Notes textarea in ConstraintSelector)
  const renderTextInput = () => {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange({ value_text: e.target.value })}
        placeholder="Enter constraint details..."
        rows={3}
        disabled={disabled}
        className="w-full min-h-[4.5rem] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed resize-none"
      />
    );
  };

  // Handle dropdown input
  const renderDropdownInput = () => {
    const options = dropdown_options || [];

    return (
      <select
        value={value || ''}
        onChange={(e) => onChange({ value_text: e.target.value })}
        disabled={disabled}
        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <option value="">Select value...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  };

  // Handle date input
  const renderDateInput = () => {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange({ value_date: e.target.value })}
        disabled={disabled}
        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
      />
    );
  };

  // Render appropriate input based on value type
  switch (value_type) {
    case 'numeric':
      return renderNumericInput();
    case 'text':
      return renderTextInput();
    case 'dropdown':
      return renderDropdownInput();
    case 'date':
      return renderDateInput();
    default:
      return renderTextInput();
  }
}

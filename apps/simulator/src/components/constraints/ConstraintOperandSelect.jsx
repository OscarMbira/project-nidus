/**
 * Constraint Operand Select Component
 * Dropdown for selecting comparison operands
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const OPERAND_OPTIONS = [
  { value: '=', symbol: '=', label: 'Equal to' },
  { value: '<', symbol: '<', label: 'Less than' },
  { value: '<=', symbol: '≤', label: 'Less than or equal' },
  { value: '>', symbol: '>', label: 'Greater than' },
  { value: '>=', symbol: '≥', label: 'Greater than or equal' },
  { value: 'between', symbol: '↔', label: 'Between' }
];

export default function ConstraintOperandSelect({
  value,
  onChange,
  availableOperands = null,
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Filter operands if specific ones are provided
  const operands = availableOperands
    ? OPERAND_OPTIONS.filter((op) => availableOperands.includes(op.value))
    : OPERAND_OPTIONS;

  // Get selected operand
  const selectedOperand = OPERAND_OPTIONS.find((op) => op.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (operand) => {
    onChange(operand.value);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-colors min-w-[100px]
          ${disabled
            ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
            : 'bg-white dark:bg-gray-800 hover:border-blue-500 cursor-pointer'
          }
          ${isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-300 dark:border-gray-600'
          }`}
      >
        {selectedOperand ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg text-blue-600 dark:text-blue-400">
              {selectedOperand.symbol}
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
              {selectedOperand.label}
            </span>
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400 text-sm">Operand</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden min-w-[180px]">
          {operands.map((operand) => (
            <button
              key={operand.value}
              type="button"
              onClick={() => handleSelect(operand)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3
                ${value === operand.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <span className="font-mono text-lg text-blue-600 dark:text-blue-400 w-6 text-center">
                {operand.symbol}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {operand.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

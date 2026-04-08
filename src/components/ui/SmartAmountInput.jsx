/**
 * SmartAmountInput Component
 *
 * A reusable input component that supports shorthand amount notation
 * (e.g., 10k = 10,000, 3m = 3,000,000)
 *
 * @module components/ui/SmartAmountInput
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAmountShorthand } from '../../hooks/useAmountShorthand';
import {
  formatWithSeparators,
  getCurrencySymbol,
  SHORTHAND_SUFFIXES,
} from '../../utils/amountShorthand';

/**
 * SmartAmountInput - Input component with shorthand conversion support
 *
 * @param {object} props - Component props
 * @param {number|null} props.value - Current numeric value
 * @param {function} props.onChange - Callback when value changes (receives number or null)
 * @param {string} props.placeholder - Input placeholder text
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {boolean} props.required - Whether input is required
 * @param {number} props.min - Minimum allowed value
 * @param {number} props.max - Maximum allowed value
 * @param {number} props.step - Step increment for native number controls
 * @param {number} props.decimals - Decimal places for display (default: 2)
 * @param {string} props.currency - Currency code (e.g., 'USD', 'ZAR')
 * @param {boolean} props.showCurrencySymbol - Show currency symbol prefix
 * @param {boolean} props.enableShorthand - Enable shorthand conversion (default: true)
 * @param {boolean} props.convertOnEnter - Convert on Enter key (default: true)
 * @param {boolean} props.convertOnBlur - Convert on blur (default: true)
 * @param {boolean} props.showConversionHint - Show hint when shorthand detected (default: true)
 * @param {boolean} props.showShorthandHelper - Show shorthand reference tooltip (default: false)
 * @param {string} props.className - Additional CSS classes for wrapper
 * @param {string} props.inputClassName - Additional CSS classes for input
 * @param {string} props.size - Input size: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} props.id - Input ID
 * @param {string} props.name - Input name
 * @param {function} props.onConversion - Callback when shorthand is converted
 * @param {function} props.onValidationError - Callback for validation errors
 * @param {string} props.ariaLabel - ARIA label for accessibility
 * @param {string} props.ariaDescribedBy - ARIA described by ID
 */
export function SmartAmountInput({
  value,
  onChange,
  placeholder = 'Enter amount (e.g., 10k)',
  disabled = false,
  required = false,
  min,
  max,
  step = 0.01,
  decimals = 2,
  currency,
  showCurrencySymbol = false,
  enableShorthand = true,
  convertOnEnter = true,
  convertOnBlur = true,
  showConversionHint = true,
  showShorthandHelper = false,
  className = '',
  inputClassName = '',
  size = 'md',
  id,
  name,
  onConversion,
  onValidationError,
  ariaLabel,
  ariaDescribedBy,
  ...rest
}) {
  const { theme } = useTheme();
  const inputRef = useRef(null);
  const [showHelper, setShowHelper] = useState(false);

  // Use the shorthand hook
  const {
    displayValue,
    numericValue,
    error,
    isFocused,
    justConverted,
    hasShorthand,
    conversionHint,
    inputProps,
    setValue,
  } = useAmountShorthand({
    initialValue: value,
    onChange,
    min,
    max,
    decimals,
    convertOnEnter: enableShorthand && convertOnEnter,
    convertOnBlur: enableShorthand && convertOnBlur,
    onConversion,
    onValidationError,
  });

  // Sync external value changes
  useEffect(() => {
    if (value !== numericValue) {
      setValue(value);
    }
  }, [value]);

  // Theme-based styles
  const isDark = theme === 'dark';

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };

  // Base input styles
  const baseInputStyles = useMemo(() => {
    const base = `
      w-full rounded-md border transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      ${sizeClasses[size] || sizeClasses.md}
    `;

    if (disabled) {
      return `${base} cursor-not-allowed opacity-60 ${
        isDark
          ? 'bg-gray-800 border-gray-700 text-gray-500'
          : 'bg-gray-100 border-gray-300 text-gray-400'
      }`;
    }

    if (error) {
      return `${base} ${
        isDark
          ? 'bg-gray-700 border-red-500 text-white focus:ring-red-500'
          : 'bg-white border-red-500 text-gray-900 focus:ring-red-500'
      }`;
    }

    if (justConverted) {
      return `${base} ${
        isDark
          ? 'bg-green-900/20 border-green-500 text-white focus:ring-green-500'
          : 'bg-green-50 border-green-500 text-gray-900 focus:ring-green-500'
      }`;
    }

    return `${base} ${
      isDark
        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
    }`;
  }, [isDark, disabled, error, justConverted, size]);

  // Currency symbol
  const currencySymbolDisplay = useMemo(() => {
    if (!showCurrencySymbol || !currency) return null;
    return getCurrencySymbol(currency);
  }, [showCurrencySymbol, currency]);

  // Hint ID for accessibility
  const hintId = id ? `${id}-hint` : undefined;
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className={`relative ${className}`}>
      {/* Input wrapper with optional currency symbol */}
      <div className="relative flex items-center">
        {/* Currency symbol prefix */}
        {currencySymbolDisplay && (
          <span
            className={`absolute left-3 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            } ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`}
          >
            {currencySymbolDisplay}
          </span>
        )}

        {/* Main input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={`
            ${baseInputStyles}
            ${currencySymbolDisplay ? 'pl-8' : ''}
            ${showShorthandHelper ? 'pr-10' : ''}
            ${inputClassName}
          `}
          aria-label={ariaLabel || 'Amount input'}
          aria-describedby={[
            ariaDescribedBy,
            hintId,
            errorId,
          ].filter(Boolean).join(' ') || undefined}
          aria-invalid={!!error}
          {...inputProps}
          {...rest}
        />

        {/* Shorthand helper button */}
        {showShorthandHelper && enableShorthand && (
          <button
            type="button"
            onClick={() => setShowHelper(!showHelper)}
            className={`absolute right-2 p-1 rounded transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Show shorthand help"
            title="Shorthand notation help"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Conversion hint */}
      {showConversionHint && enableShorthand && hasShorthand && conversionHint && isFocused && (
        <div
          id={hintId}
          className={`mt-1 text-xs flex items-center gap-1 ${
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}
          role="status"
          aria-live="polite"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
          <span>{conversionHint}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          id={errorId}
          className={`mt-1 text-xs ${
            isDark ? 'text-red-400' : 'text-red-600'
          }`}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Shorthand helper tooltip */}
      {showHelper && enableShorthand && (
        <div
          className={`absolute z-10 mt-1 p-3 rounded-lg shadow-lg border ${
            isDark
              ? 'bg-gray-800 border-gray-700 text-gray-200'
              : 'bg-white border-gray-200 text-gray-800'
          }`}
          style={{ minWidth: '200px' }}
        >
          <div className="text-sm font-medium mb-2">Shorthand Notation</div>
          <div className="space-y-1">
            {SHORTHAND_SUFFIXES.map((item) => (
              <div
                key={item.suffix}
                className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
              >
                <span className="font-mono font-medium">{item.suffix}</span>
                <span className="mx-1">=</span>
                <span>{item.name}</span>
                <span className={`ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  ({item.example})
                </span>
              </div>
            ))}
          </div>
          <div className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Press Enter or Tab to convert
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SmartCurrencyInput - Convenience wrapper with currency support
 */
export function SmartCurrencyInput({
  currency = 'USD',
  showCurrencySymbol = true,
  ...props
}) {
  return (
    <SmartAmountInput
      currency={currency}
      showCurrencySymbol={showCurrencySymbol}
      {...props}
    />
  );
}

/**
 * SmartBudgetInput - Convenience wrapper for budget fields
 */
export function SmartBudgetInput({
  placeholder = 'Enter budget (e.g., 50k, 2m)',
  min = 0,
  ...props
}) {
  return (
    <SmartAmountInput
      placeholder={placeholder}
      min={min}
      showShorthandHelper
      {...props}
    />
  );
}

export default SmartAmountInput;

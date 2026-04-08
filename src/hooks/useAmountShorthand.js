/**
 * useAmountShorthand Hook
 *
 * React hook for managing amount input with shorthand conversion support
 *
 * @module hooks/useAmountShorthand
 */

import { useState, useCallback, useMemo } from 'react';
import {
  parseShorthandAmount,
  hasShorthandSuffix,
  formatWithSeparators,
  getConversionHint,
  validateAmountRange,
} from '../utils/amountShorthand';

/**
 * Hook for managing amount input with shorthand conversion
 *
 * @param {object} options - Hook options
 * @param {number|null} options.initialValue - Initial numeric value
 * @param {function} options.onChange - Callback when value changes
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @param {number} options.decimals - Decimal places for display (default: 2)
 * @param {boolean} options.convertOnEnter - Convert shorthand on Enter (default: true)
 * @param {boolean} options.convertOnBlur - Convert shorthand on blur (default: true)
 * @param {function} options.onConversion - Callback when conversion happens
 * @param {function} options.onValidationError - Callback for validation errors
 *
 * @returns {object} Hook state and handlers
 */
export function useAmountShorthand(options = {}) {
  const {
    initialValue = null,
    onChange,
    min,
    max,
    decimals = 2,
    convertOnEnter = true,
    convertOnBlur = true,
    onConversion,
    onValidationError,
  } = options;

  // Display value (what user sees in input)
  const [displayValue, setDisplayValue] = useState(() => {
    if (initialValue === null || initialValue === undefined) return '';
    return formatWithSeparators(initialValue, { decimals });
  });

  // Actual numeric value
  const [numericValue, setNumericValue] = useState(initialValue);

  // Whether input is currently focused
  const [isFocused, setIsFocused] = useState(false);

  // Error state
  const [error, setError] = useState(null);

  // Whether a conversion just happened (for animation)
  const [justConverted, setJustConverted] = useState(false);

  /**
   * Check if current display value has shorthand suffix
   */
  const hasShorthand = useMemo(() => {
    return hasShorthandSuffix(displayValue);
  }, [displayValue]);

  /**
   * Get conversion hint for current input
   */
  const conversionHint = useMemo(() => {
    return getConversionHint(displayValue);
  }, [displayValue]);

  /**
   * Perform the conversion from shorthand to full value
   */
  const performConversion = useCallback(() => {
    const result = parseShorthandAmount(displayValue);

    if (result.value !== null) {
      // Validate range
      const validation = validateAmountRange(result.value, { min, max });

      if (!validation.valid) {
        setError(validation.error);
        if (onValidationError) {
          onValidationError(validation.error);
        }
        return false;
      }

      // Clear any error
      setError(null);

      // Update numeric value
      setNumericValue(result.value);

      // Format display value
      const formattedValue = formatWithSeparators(result.value, { decimals });
      setDisplayValue(formattedValue);

      // Trigger conversion callback
      if (result.wasShorthand && onConversion) {
        onConversion(result.original, result.value);
      }

      // Trigger onChange
      if (onChange) {
        onChange(result.value);
      }

      // Trigger animation
      if (result.wasShorthand) {
        setJustConverted(true);
        setTimeout(() => setJustConverted(false), 500);
      }

      return true;
    }

    return false;
  }, [displayValue, min, max, decimals, onChange, onConversion, onValidationError]);

  /**
   * Handle input change
   */
  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setDisplayValue(value);
    setError(null);

    // If it's a plain number (no shorthand), update numeric value immediately
    if (!hasShorthandSuffix(value)) {
      const result = parseShorthandAmount(value);
      if (result.value !== null) {
        setNumericValue(result.value);
        if (onChange) {
          onChange(result.value);
        }
      } else if (value === '' || value === '-') {
        setNumericValue(null);
        if (onChange) {
          onChange(null);
        }
      }
    }
  }, [onChange]);

  /**
   * Handle key down events
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && convertOnEnter && hasShorthand) {
      e.preventDefault();
      performConversion();
    }
  }, [convertOnEnter, hasShorthand, performConversion]);

  /**
   * Handle focus
   */
  const handleFocus = useCallback((e) => {
    setIsFocused(true);

    // On focus, show raw number for editing (without separators)
    if (numericValue !== null && !hasShorthand) {
      setDisplayValue(String(numericValue));
    }
  }, [numericValue, hasShorthand]);

  /**
   * Handle blur
   */
  const handleBlur = useCallback((e) => {
    setIsFocused(false);

    if (convertOnBlur) {
      performConversion();
    } else if (numericValue !== null) {
      // Just format the display
      setDisplayValue(formatWithSeparators(numericValue, { decimals }));
    }
  }, [convertOnBlur, performConversion, numericValue, decimals]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    if (initialValue === null || initialValue === undefined) {
      setDisplayValue('');
      setNumericValue(null);
    } else {
      setDisplayValue(formatWithSeparators(initialValue, { decimals }));
      setNumericValue(initialValue);
    }
    setError(null);
    setJustConverted(false);
  }, [initialValue, decimals]);

  /**
   * Set value programmatically
   */
  const setValue = useCallback((value) => {
    if (value === null || value === undefined) {
      setDisplayValue('');
      setNumericValue(null);
    } else {
      const numVal = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numVal)) {
        setNumericValue(numVal);
        if (!isFocused) {
          setDisplayValue(formatWithSeparators(numVal, { decimals }));
        } else {
          setDisplayValue(String(numVal));
        }
      }
    }
    setError(null);
  }, [isFocused, decimals]);

  /**
   * Clear the input
   */
  const clear = useCallback(() => {
    setDisplayValue('');
    setNumericValue(null);
    setError(null);
    if (onChange) {
      onChange(null);
    }
  }, [onChange]);

  return {
    // Values
    displayValue,
    numericValue,
    error,
    isFocused,
    justConverted,

    // Computed
    hasShorthand,
    conversionHint,

    // Handlers
    handleChange,
    handleKeyDown,
    handleFocus,
    handleBlur,

    // Actions
    performConversion,
    reset,
    setValue,
    clear,

    // Input props (spread these on the input element)
    inputProps: {
      value: displayValue,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}

export default useAmountShorthand;

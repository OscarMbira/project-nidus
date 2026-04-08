/**
 * SearchableSelect Component
 * A searchable dropdown select component — theme aware (light + dark)
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select...',
  required = false,
  icon: Icon = null,
  searchPlaceholder = 'Search...',
  className = '',
  disabled = false,
  allowCustom = false,
  loading = false,
  openAbove = false,
  maxDropdownHeight = 320,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Memoize filtered options to prevent recalculation on every render
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options || [];
    const searchLower = searchTerm.toLowerCase();
    return (options || []).filter(option => {
      if (!option) return false;
      const label = typeof option === 'string' ? option : (option.label || option.name || String(option));
      return String(label).toLowerCase().includes(searchLower);
    });
  }, [options, searchTerm]);

  // Memoize selected option label
  const selectedLabel = useMemo(() => {
    const selectedOption = (options || []).find(opt => {
      if (!opt) return false;
      const optValue = typeof opt === 'string' ? opt : (opt.value || opt.code || opt);
      return String(optValue) === String(value);
    });
    return selectedOption
      ? (typeof selectedOption === 'string' ? selectedOption : (selectedOption.label || selectedOption.name || String(selectedOption)))
      : '';
  }, [options, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation - memoized
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          const option = filteredOptions[focusedIndex];
          const optValue = typeof option === 'string' ? option : option.value || option.code || option;
          onChange(optValue);
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
        } else if (allowCustom && searchTerm.trim()) {
          onChange(searchTerm.trim());
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
    }
  }, [isOpen, filteredOptions, focusedIndex, onChange, allowCustom, searchTerm]);

  const handleSelect = useCallback((option) => {
    if (!option) return;
    const optValue = typeof option === 'string' ? option : (option.value || option.code || option);
    if (onChange && typeof onChange === 'function') {
      onChange(optValue);
    }
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  }, [onChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  }, [onChange]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-10 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-left flex items-center justify-between relative ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${required && !value ? 'border-red-500' : ''}`}
      >
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400 flex-shrink-0 pointer-events-none" />
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`${selectedLabel ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'} truncate text-sm`}>
            {selectedLabel || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {value && !disabled && (
            <X
              className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown - opens above when openAbove to avoid covering content below */}
      {isOpen && (
        <div
          className={`absolute z-50 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden ${
            openAbove ? 'bottom-full mb-1' : 'mt-1'
          }`}
          style={{ maxHeight: typeof maxDropdownHeight === 'number' ? `${maxDropdownHeight}px` : maxDropdownHeight }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setFocusedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Options List - scrollable so dropdown stays compact */}
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {loading ? (
              <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                {allowCustom && searchTerm.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchTerm.trim());
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="w-full text-left text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Use "{searchTerm.trim()}" as custom value
                  </button>
                ) : (
                  'No options found'
                )}
              </div>
            ) : (
              <>
                {filteredOptions.map((option, index) => {
                  if (!option) return null;
                  const optValue = typeof option === 'string' ? option : (option.value || option.code || option);
                  const optLabel = typeof option === 'string' ? option : (option.label || option.name || String(option));
                  const isSelected = String(optValue) === String(value);
                  const isFocused = index === focusedIndex;

                  return (
                    <button
                      key={String(optValue) || index}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                      } ${isFocused ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                    >
                      {String(optLabel)}
                    </button>
                  );
                }).filter(Boolean)}
                {/* Show custom value option at the end if search doesn't exactly match any option */}
                {allowCustom && searchTerm.trim() && !filteredOptions.some(opt => {
                  const label = typeof opt === 'string' ? opt : (opt.label || opt.name || String(opt));
                  return String(label).toLowerCase() === searchTerm.trim().toLowerCase();
                }) && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchTerm.trim());
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-gray-600"
                  >
                    Use "{searchTerm.trim()}" as custom value
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(SearchableSelect);

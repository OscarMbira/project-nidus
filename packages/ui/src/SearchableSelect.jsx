/**
 * SearchableSelect Component
 * A searchable dropdown select component — theme aware (light + dark)
 * Opens upward automatically when there is not enough space below the trigger.
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
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
  /** When true, always open above. When false/undefined, auto-flip near viewport edges. */
  openAbove = false,
  maxDropdownHeight = 360,
  listMaxHeight = null,
  /**
   * Combobox mode: when open, the trigger becomes the search field (no second nested search bar).
   * Better for dense forms / side-by-side panels.
   */
  combobox = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [placementAbove, setPlacementAbove] = useState(Boolean(openAbove));
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const panelMax =
    typeof maxDropdownHeight === 'number' ? maxDropdownHeight : Number.parseInt(String(maxDropdownHeight), 10) || 360;
  // Combobox keeps search in the trigger, so the list can use the full panel height.
  const optionsMaxHeight =
    typeof listMaxHeight === 'number'
      ? listMaxHeight
      : Math.max(220, panelMax - (combobox ? 8 : 56));

  const resolveOpenAbove = useCallback(() => {
    if (openAbove === true) return true
    const el = dropdownRef.current
    if (!el || typeof window === 'undefined') return false
    const rect = el.getBoundingClientRect()
    const gap = 8
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const spaceAbove = rect.top - gap
    const needed = panelMax
    // Prefer below when it fits; otherwise open above if that has more room.
    if (spaceBelow >= needed) return false
    return spaceAbove >= spaceBelow
  }, [openAbove, panelMax])

  const openMenu = useCallback(() => {
    if (disabled) return
    setPlacementAbove(resolveOpenAbove())
    setIsOpen(true)
    // Combobox: focus the unified search field on open.
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [disabled, resolveOpenAbove])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setSearchTerm('')
    setFocusedIndex(-1)
  }, [])

  // Re-check placement after paint (scroll containers / late layout).
  useLayoutEffect(() => {
    if (!isOpen) return
    setPlacementAbove(resolveOpenAbove())
  }, [isOpen, resolveOpenAbove])

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
      : (value ? String(value) : '');
  }, [options, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeMenu()
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeMenu]);

  // Handle keyboard navigation - memoized
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
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
          closeMenu();
        } else if (allowCustom && searchTerm.trim()) {
          onChange(searchTerm.trim());
          closeMenu();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
    }
  }, [isOpen, filteredOptions, focusedIndex, onChange, allowCustom, searchTerm, openMenu, closeMenu]);

  const handleSelect = useCallback((option) => {
    if (!option) return;
    const optValue = typeof option === 'string' ? option : (option.value || option.code || option);
    if (onChange && typeof onChange === 'function') {
      onChange(optValue);
    }
    closeMenu();
  }, [onChange, closeMenu]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  }, [onChange]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger — in combobox mode this becomes the search field while open */}
      {combobox && isOpen ? (
        <div
          className={`relative flex w-full items-center rounded-lg border-2 border-blue-500 bg-white py-2.5 pl-10 pr-10 text-left shadow-sm ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-gray-950 dark:ring-blue-400/30 ${
            required && !value ? 'border-red-500' : ''
          }`}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-300" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setFocusedIndex(-1)
            }}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder || placeholder}
            disabled={disabled}
            className="w-full bg-transparent text-sm font-medium text-gray-900 placeholder-gray-500 focus:outline-none dark:text-gray-50 dark:placeholder-gray-400"
            aria-label={searchPlaceholder || placeholder}
            autoFocus
          />
          <button
            type="button"
            onClick={closeMenu}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
            title="Close"
            aria-label="Close role list"
          >
            <ChevronDown className="h-5 w-5 rotate-180" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (disabled) return
            if (isOpen) closeMenu()
            else openMenu()
          }}
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
      )}

      {/* Dropdown — flips above when near the bottom of the viewport */}
      {isOpen && (
        <div
          className={`absolute z-[80] flex w-full flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-2xl dark:border-gray-500 dark:bg-gray-950 ${
            placementAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: `${panelMax}px` }}
        >
          {/* Nested search only when not in combobox mode */}
          {!combobox && (
            <div className="shrink-0 border-b border-gray-200 bg-white p-2 dark:border-gray-600 dark:bg-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                  className="w-full rounded border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options list — taller pane + clearer scrollbar for long role lists */}
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:auto] [scrollbar-color:rgb(156_163_175)_rgb(243_244_246)] dark:[scrollbar-color:rgb(107_114_128)_rgb(31_41_55)] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500 dark:[&::-webkit-scrollbar-thumb]:bg-gray-500 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
            style={{ maxHeight: `${optionsMaxHeight}px` }}
            role="listbox"
          >
            {loading ? (
              <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                {allowCustom && searchTerm.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchTerm.trim());
                      closeMenu();
                    }}
                    className="w-full text-left text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Use &quot;{searchTerm.trim()}&quot; as custom value
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
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option)}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-white'
                          : 'text-gray-900 hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-gray-800'
                      } ${isFocused && !isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                    >
                      {String(optLabel)}
                    </button>
                  );
                }).filter(Boolean)}
                {allowCustom && searchTerm.trim() && !filteredOptions.some(opt => {
                  const label = typeof opt === 'string' ? opt : (opt.label || opt.name || String(opt));
                  return String(label).toLowerCase() === searchTerm.trim().toLowerCase();
                }) && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(searchTerm.trim());
                      closeMenu();
                    }}
                    className="w-full border-t border-gray-200 px-4 py-2.5 text-left text-sm text-blue-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-blue-400 dark:hover:bg-gray-700"
                  >
                    Use &quot;{searchTerm.trim()}&quot; as custom value
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

/**
 * Constraint Category Select Component
 * Searchable dropdown for selecting constraint categories
 */

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, AlertCircle } from 'lucide-react';

export default function ConstraintCategorySelect({
  categories = [],
  selectedCategoryId,
  onChange,
  excludeIds = [],
  disabled = false,
  placeholder = 'Select constraint category...'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter categories based on search and excluded IDs
  const filteredCategories = categories.filter((category) => {
    if (!category || !category.id) return false; // Filter out invalid categories
    // Exclude already used categories
    if (excludeIds.includes(category.id)) return false;
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    return (
      category.name?.toLowerCase().includes(search) ||
      category.code?.toLowerCase().includes(search) ||
      category.description?.toLowerCase().includes(search)
    );
  });
  
  // Get available categories (not excluded)
  const availableCategories = categories.filter(c => c && c.id && !excludeIds.includes(c.id));
  

  // Get selected category
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (category) => {
    onChange(category);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  const getValueTypeLabel = (valueType) => {
    const labels = {
      numeric: 'Numeric',
      text: 'Text',
      dropdown: 'Dropdown',
      date: 'Date'
    };
    return labels[valueType] || valueType;
  };

  const getValueTypeColor = (valueType) => {
    const colors = {
      numeric: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      text: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      dropdown: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      date: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    };
    return colors[valueType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected value display / trigger */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-2 text-left border rounded-lg transition-colors
          ${disabled
            ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
            : 'bg-white dark:bg-gray-800 hover:border-blue-500 cursor-pointer'
          }
          ${isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-300 dark:border-gray-600'
          }`}
      >
        {selectedCategory ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {selectedCategory.code}
            </span>
            <span className="text-gray-900 dark:text-white truncate">
              {selectedCategory.name}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${getValueTypeColor(selectedCategory.value_type)}`}>
              {getValueTypeLabel(selectedCategory.value_type)}
            </span>
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 ml-2">
          {selectedCategory && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search constraints..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-56">
            {categories.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium">No constraint categories available</p>
                    <p className="text-xs mt-1">Please ensure SQL migration v251_constraint_categories_table.sql has been run.</p>
                  </div>
                </div>
              </div>
            ) : availableCategories.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  <p className="font-medium">All constraint categories have been added</p>
                  <p className="text-xs">Remove an existing constraint to add a different one.</p>
                </div>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                No matching categories found
              </div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                    ${selectedCategoryId === category.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded min-w-[2.5rem] text-center">
                      {category.code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {category.name}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getValueTypeColor(category.value_type)}`}>
                          {getValueTypeLabel(category.value_type)}
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

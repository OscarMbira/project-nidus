/**
 * SearchableSelect — theme-aware searchable dropdown.
 * Panel renders in a portal so overflow:hidden ancestors (tables, cards) cannot clip the search field.
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'

const PANEL_GAP = 6
const VIEWPORT_PAD = 8

function optionValue(option) {
  if (!option) return ''
  return typeof option === 'string' ? option : (option.value ?? option.code ?? option)
}

function optionLabel(option) {
  if (!option) return ''
  return typeof option === 'string' ? option : (option.label ?? option.name ?? String(optionValue(option)))
}

function optionSearchText(option) {
  if (!option) return ''
  if (typeof option === 'string') return option
  return [option.label, option.name, option.value, option.code, option.description]
    .filter(Boolean)
    .join(' ')
}

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
  /** When set, a new name must be committed through one of these actions instead of a bare custom value. */
  customValueActions = [],
  loading = false,
  /** When true, always open above. When false/undefined, auto-flip near viewport edges. */
  openAbove = false,
  maxDropdownHeight = 360,
  listMaxHeight = null,
  /**
   * Combobox mode: when open, the trigger becomes the search field (no second nested search bar).
   * Better for dense forms / table cells.
   */
  combobox = false,
  /** When options include `description`, show it as a right-hand column; this labels that column. */
  descriptionColumnLabel = '',
  /** Place the description column beside the name instead of at the far edge of a wide list. */
  descriptionColumnBeside = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [placementAbove, setPlacementAbove] = useState(Boolean(openAbove))
  const [panelStyle, setPanelStyle] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const inputRef = useRef(null)

  const panelMax =
    typeof maxDropdownHeight === 'number' ? maxDropdownHeight : Number.parseInt(String(maxDropdownHeight), 10) || 360
  const optionsMaxHeight =
    typeof listMaxHeight === 'number'
      ? listMaxHeight
      : Math.max(220, panelMax - (combobox ? 8 : 56))

  const showDescriptionColumn = useMemo(
    () => (options || []).some(
      (opt) => opt && typeof opt === 'object' && opt.description != null && String(opt.description).trim() !== '',
    ),
    [options],
  )

  const descriptionColumnClass = descriptionColumnBeside
    ? 'grid grid-cols-[minmax(8rem,16rem)_8.5rem] items-center gap-x-6 text-left'
    : 'grid w-full grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-4 text-left'

  const namedCustomActions = Array.isArray(customValueActions)
    ? customValueActions.filter((action) => action?.key)
    : []

  const renderCustomActions = (term, bordered) => {
    if (!allowCustom || !term) return null
    if (namedCustomActions.length === 0) {
      return (
        <button
          type="button"
          onClick={() => {
            onChange?.(term)
            closeMenu()
          }}
          className={`w-full px-4 py-2.5 text-left text-sm text-blue-600 transition-colors hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-gray-700 ${
            bordered ? 'border-t border-gray-200 dark:border-gray-600' : ''
          }`}
        >
          Use &quot;{term}&quot; as custom value
        </button>
      )
    }
    return (
      <div className={bordered ? 'border-t border-gray-200 dark:border-gray-600' : ''}>
        {namedCustomActions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => {
              action.onSelect?.(term)
              closeMenu()
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-blue-600 transition-colors hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-gray-700"
          >
            {typeof action.label === 'function' ? action.label(term) : action.label}
          </button>
        ))}
      </div>
    )
  }

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current
    if (!el || typeof window === 'undefined') return
    const rect = el.getBoundingClientRect()
    const gap = PANEL_GAP
    const spaceBelow = window.innerHeight - rect.bottom - gap - VIEWPORT_PAD
    const spaceAbove = rect.top - gap - VIEWPORT_PAD
    const preferAbove =
      openAbove === true || (spaceBelow < Math.min(panelMax, 240) && spaceAbove >= spaceBelow)
    setPlacementAbove(preferAbove)

    const width = Math.min(Math.max(rect.width, showDescriptionColumn ? 340 : 240), window.innerWidth - VIEWPORT_PAD * 2)
    let left = rect.left
    if (left + width > window.innerWidth - VIEWPORT_PAD) {
      left = Math.max(VIEWPORT_PAD, window.innerWidth - width - VIEWPORT_PAD)
    }

    const maxH = Math.min(panelMax, preferAbove ? spaceAbove : spaceBelow)
    if (preferAbove) {
      setPanelStyle({
        position: 'fixed',
        left,
        width,
        bottom: window.innerHeight - rect.top + gap,
        top: 'auto',
        maxHeight: Math.max(160, maxH),
        zIndex: 80,
      })
    } else {
      setPanelStyle({
        position: 'fixed',
        left,
        width,
        top: rect.bottom + gap,
        bottom: 'auto',
        maxHeight: Math.max(160, maxH),
        zIndex: 80,
      })
    }
  }, [openAbove, panelMax, showDescriptionColumn])

  const openMenu = useCallback(() => {
    if (disabled) return
    setIsOpen(true)
    requestAnimationFrame(() => {
      updatePanelPosition()
      inputRef.current?.focus()
    })
  }, [disabled, updatePanelPosition])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setSearchTerm('')
    setFocusedIndex(-1)
    setPanelStyle(null)
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    updatePanelPosition()
  }, [isOpen, updatePanelPosition, searchTerm, options?.length])

  useEffect(() => {
    if (!isOpen) return undefined
    const onScrollOrResize = () => updatePanelPosition()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [isOpen, updatePanelPosition])

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options || []
    const searchLower = searchTerm.toLowerCase()
    return (options || []).filter((option) => {
      if (!option) return false
      return optionSearchText(option).toLowerCase().includes(searchLower)
    })
  }, [options, searchTerm])

  const selectedLabel = useMemo(() => {
    const selectedOption = (options || []).find((opt) => String(optionValue(opt)) === String(value))
    return selectedOption ? optionLabel(selectedOption) : (value ? String(value) : '')
  }, [options, value])

  useEffect(() => {
    const handleClickOutside = (event) => {
      const t = event.target
      if (triggerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      closeMenu()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeMenu])

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openMenu()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          onChange?.(optionValue(filteredOptions[focusedIndex]))
          closeMenu()
        } else if (allowCustom && searchTerm.trim() && namedCustomActions.length === 0) {
          onChange?.(searchTerm.trim())
          closeMenu()
        }
        break
      case 'Escape':
        e.preventDefault()
        closeMenu()
        break
      default:
        break
    }
  }, [isOpen, filteredOptions, focusedIndex, onChange, allowCustom, searchTerm, openMenu, closeMenu, namedCustomActions.length])

  const handleSelect = useCallback((option) => {
    if (!option) return
    onChange?.(optionValue(option))
    closeMenu()
  }, [onChange, closeMenu])

  const handleClear = useCallback((e) => {
    e.stopPropagation()
    onChange?.('')
    setSearchTerm('')
  }, [onChange])

  const listHeight = Math.max(120, (panelStyle?.maxHeight || panelMax) - (combobox ? 8 : 56))

  const panel = isOpen && panelStyle && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={panelRef}
        className="flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-2xl dark:border-gray-500 dark:bg-gray-950"
        style={panelStyle}
        role="listbox"
      >
        {!combobox && (
          <div className="shrink-0 border-b border-gray-200 bg-white p-2 dark:border-gray-600 dark:bg-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setFocusedIndex(-1)
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full rounded border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"
                autoFocus
              />
            </div>
          </div>
        )}

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ maxHeight: `${Math.min(optionsMaxHeight, listHeight)}px` }}
        >
          {loading ? (
            <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-0 py-1 text-sm text-gray-500 dark:text-gray-400">
              {allowCustom && searchTerm.trim() ? (
                renderCustomActions(searchTerm.trim(), false)
              ) : (
                <div className="px-4 py-3 text-center">No options found</div>
              )}
            </div>
          ) : (
            <>
              {showDescriptionColumn && descriptionColumnLabel ? (
                <div
                  className={`sticky top-0 z-[1] border-b border-gray-200 bg-gray-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 ${descriptionColumnClass}`}
                  aria-hidden="true"
                >
                  <span className="min-w-0 truncate">Name</span>
                  <span>{descriptionColumnLabel}</span>
                </div>
              ) : null}
              {filteredOptions.map((option, index) => {
                if (!option) return null
                const optValue = optionValue(option)
                const optLabel = optionLabel(option)
                const optDescription =
                  option && typeof option === 'object' && option.description != null
                    ? String(option.description).trim()
                    : ''
                const isSelected = String(optValue) === String(value)
                const isFocused = index === focusedIndex
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
                    {showDescriptionColumn ? (
                      <span className={descriptionColumnClass}>
                        <span className="min-w-0 truncate">{String(optLabel)}</span>
                        <span
                          className={`text-sm font-medium ${
                            isSelected
                              ? 'text-blue-800 dark:text-white'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {optDescription || '—'}
                        </span>
                      </span>
                    ) : (
                      String(optLabel)
                    )}
                  </button>
                )
              })}
              {allowCustom && searchTerm.trim() && !filteredOptions.some((opt) =>
                optionLabel(opt).toLowerCase() === searchTerm.trim().toLowerCase(),
              ) && renderCustomActions(searchTerm.trim(), true)}
            </>
          )}
        </div>
      </div>,
      document.body,
    )
    : null

  return (
    <div className={`relative ${className}`} ref={triggerRef}>
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
            aria-label="Close list"
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

      {panel}
      {/* placementAbove retained for callers/tests that may read state via DOM */}
      <span className="sr-only" data-placement={placementAbove ? 'above' : 'below'} />
    </div>
  )
}

export default React.memo(SearchableSelect)

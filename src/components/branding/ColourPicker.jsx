/**
 * ColourPicker
 * A colour-picker row with a native colour input, hex text field,
 * copy-to-clipboard button, per-colour reset, and a WCAG contrast warning.
 */
import { useState, useRef } from 'react'
import { Copy, Check, RotateCcw, AlertTriangle } from 'lucide-react'
import { validateHexColor, getContrastRatio } from '../../services/brandingService'

export default function ColourPicker({
  label,
  description,
  value,
  defaultValue,
  onChange,
  /** optional: a second hex to check contrast against (e.g. white text on this bg) */
  contrastAgainst = '#FFFFFF',
}) {
  const [copied, setCopied]     = useState(false)
  const [hexInput, setHexInput] = useState(value || defaultValue)
  const inputRef = useRef(null)

  const current = value || defaultValue
  const isValid = validateHexColor(current)

  // WCAG AA contrast check
  const ratio = isValid ? getContrastRatio(current, contrastAgainst) : null
  const contrastOk = ratio === null || ratio >= 4.5

  const handleNativeChange = (e) => {
    const hex = e.target.value.toUpperCase()
    setHexInput(hex)
    if (validateHexColor(hex)) onChange(hex)
  }

  const handleTextChange = (e) => {
    let raw = e.target.value
    if (!raw.startsWith('#')) raw = '#' + raw
    raw = raw.toUpperCase()
    setHexInput(raw)
    if (validateHexColor(raw)) onChange(raw)
  }

  const handleTextBlur = () => {
    if (!validateHexColor(hexInput)) {
      setHexInput(current) // revert invalid input
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(current).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const handleReset = () => {
    setHexInput(defaultValue)
    onChange(defaultValue)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
      {/* Colour preview swatch + native picker */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-lg border-2 border-white dark:border-gray-600 shadow-md cursor-pointer"
            style={{ backgroundColor: isValid ? current : '#cccccc' }}
            onClick={() => inputRef.current?.click()}
            title="Click to pick colour"
          />
          <input
            ref={inputRef}
            type="color"
            value={isValid ? current : '#3B82F6'}
            onChange={handleNativeChange}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            aria-label={`Colour picker for ${label}`}
          />
        </div>
      </div>

      {/* Label & description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
        {!contrastOk && (
          <div className="flex items-center gap-1 mt-0.5">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Low contrast ({ratio?.toFixed(1)}:1) – WCAG AA requires 4.5:1
            </span>
          </div>
        )}
      </div>

      {/* Hex text input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={hexInput}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          maxLength={7}
          className={`w-28 px-3 py-1.5 text-sm font-mono border rounded-lg bg-white dark:bg-gray-700
            text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500
            ${!validateHexColor(hexInput) ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
          placeholder="#3B82F6"
          aria-label={`Hex value for ${label}`}
        />

        {/* Copy */}
        <button
          onClick={handleCopy}
          title="Copy hex value"
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>

        {/* Reset to default */}
        <button
          onClick={handleReset}
          title="Reset to default"
          disabled={current === defaultValue}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

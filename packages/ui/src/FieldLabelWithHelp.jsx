/**
 * FieldLabelWithHelp — a field label with contextual help (v1345).
 * PRD projectprd/v1345_field_level_contextual_help_PRD.md.
 *
 * - No help for the key (or no FieldHelpScope) → renders the plain label, no affordance (D10).
 * - With help: the label looks like any other label (no underline — D4 amended 2026-11-20); an
 *   ⓘ button appears when the label or its field is hovered, when the field has focus, or when
 *   the ⓘ is reached by keyboard (D1); on touch screens it stays faintly visible (G-D8).
 * - Double-click on the label opens help without selecting text; switched off for
 *   checkbox / radio / toggle labels, where ⓘ still works (G-D17).
 * - Popover: purpose, rules derived from the live field (G-D7), examples, format (regional
 *   tokens, G-D6), notes, "Was this helpful?" (G-D13), Learn more in a new tab (G-D11).
 *   Escape or a click elsewhere closes it; it stays open while hovered (WCAG 1.4.13).
 *   Text is rendered as text, never HTML (G-D12).
 */
import {
  Children,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import { useFieldHelpEntry, useFieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import AppConfigContext from '@nidus/shared/context/AppConfigContext'
import { recordFieldHelpOpen, recordFieldHelpVote } from '@nidus/shared/services/fieldHelpService'
import {
  buildFieldHelpRules,
  buildLearnMoreHref,
  parseFieldHelpText,
  resolveFieldHelpTokens,
} from '@nidus/shared/utils/fieldHelp'

const NO_DOUBLE_CLICK = new Set(['checkbox', 'radio', 'toggle'])
const POPOVER_WIDTH = 320
const EDGE = 16 // keep this far from the screen edges
const GAP = 6 // space between the ⓘ and the card

/**
 * Split label text from nested field controls so ⓘ stays on the label line.
 * Call sites often nest SelectField / input / textarea under FieldLabelWithHelp; putting the
 * help button after the whole children tree left ⓘ under the control (Team Detail Add member).
 *
 * - Leading string/number nodes → label row (with ⓘ).
 * - Remaining nodes → field body under the label.
 * - Checkbox-style (control first, or control=checkbox|radio|toggle) → inline: children + ⓘ.
 */
export function partitionFieldLabelChildren(children, control = 'text') {
  const nodes = Children.toArray(children)
  if (NO_DOUBLE_CLICK.has(control)) {
    return { mode: 'inline', labelNodes: nodes, fieldNodes: [] }
  }

  const labelNodes = []
  let i = 0
  while (i < nodes.length) {
    const node = nodes[i]
    if (typeof node === 'string' || typeof node === 'number') {
      if (typeof node === 'string' && node.trim() === '' && labelNodes.length === 0) {
        i += 1
        continue
      }
      labelNodes.push(node)
      i += 1
      continue
    }
    break
  }

  const fieldNodes = nodes.slice(i)
  const first = fieldNodes[0]
  const leadingControl =
    labelNodes.length === 0 &&
    isValidElement(first) &&
    (first.type === 'input' ||
      first.type === 'select' ||
      first.props?.type === 'checkbox' ||
      first.props?.type === 'radio')

  if (leadingControl) {
    return { mode: 'inline', labelNodes: nodes, fieldNodes: [] }
  }

  return { mode: 'stacked', labelNodes, fieldNodes }
}

/**
 * Where to put the help card so none of it is cut off: below the ⓘ when it fits, otherwise
 * above; when neither side fits, the side with more room, with the card scrolling inside it.
 * `height` is the card's measured content height (null before the first measurement).
 */
export function computeHelpPopoverPlacement({ rect, height, viewportWidth, viewportHeight, width = POPOVER_WIDTH }) {
  const w = Math.min(width, viewportWidth - EDGE * 2)
  const left = Math.max(EDGE, Math.min(rect.left - 8, viewportWidth - w - EDGE))
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - GAP - EDGE)
  const spaceAbove = Math.max(0, rect.top - GAP - EDGE)
  const below = (maxHeight) => ({ side: 'below', top: rect.bottom + GAP, left, width: w, maxHeight })
  const above = (h, maxHeight) => ({ side: 'above', top: rect.top - GAP - h, left, width: w, maxHeight })
  if (height == null || height <= spaceBelow) return below(spaceBelow)
  if (height <= spaceAbove) return above(height, spaceAbove)
  return spaceAbove > spaceBelow ? above(spaceAbove, spaceAbove) : below(spaceBelow)
}

/** Rules read from the labelled field itself (G-D7): select options, required, maxlength, min / max. */
function readFieldRules(htmlFor) {
  if (!htmlFor || typeof document === 'undefined') return {}
  const el = document.getElementById(htmlFor)
  if (!el) return {}
  const rules = {}
  if ('required' in el) rules.required = Boolean(el.required)
  if (el.tagName === 'SELECT') rules.options = Array.from(el.options).map((o) => o.textContent.trim()).filter(Boolean)
  if (el.maxLength > 0) rules.maxLength = el.maxLength
  const min = el.getAttribute?.('min')
  const max = el.getAttribute?.('max')
  if (min !== null && min !== undefined && min !== '' && Number.isFinite(Number(min))) rules.min = Number(min)
  if (max !== null && max !== undefined && max !== '' && Number.isFinite(Number(max))) rules.max = Number(max)
  return rules
}

function HelpText({ text, settings }) {
  const blocks = parseFieldHelpText(resolveFieldHelpTokens(text, settings))
  return blocks.map((block, i) => (block.type === 'ul'
    ? (
      <ul key={i} className="list-disc pl-5 space-y-0.5">
        {block.items.map((item, j) => <li key={j}>{item}</li>)}
      </ul>
    )
    : <p key={i}>{block.text}</p>))
}

function Section({ heading, children }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">{heading}</p>
      <div className="mt-0.5 space-y-1 text-sm text-gray-800 dark:text-gray-100">{children}</div>
    </div>
  )
}

export default function FieldLabelWithHelp({
  helpKey,
  as: Tag = 'label',
  htmlFor,
  className = '',
  children,
  control = 'text',
  required,
  maxLength,
  min,
  max,
  options,
  isAmount = false,
  /** v1345 slice 1b: help written on a user-created field's own definition ({ title, purpose, examples, format_notes }). */
  help: inlineHelp = null,
  /**
   * false for record / people pickers (e.g. Reports To): their options are other records, not a
   * fixed set of choices, so they are never listed in the help (no names copied into help).
   */
  listOptions = true,
}) {
  const scopeEntry = useFieldHelpEntry(helpKey)
  const scope = useFieldHelpScope()
  const appConfig = useContext(AppConfigContext)
  // Keyed on the help's content, so callers may build the help object on every render.
  const inlineSignature = inlineHelp?.purpose ? JSON.stringify(inlineHelp) : ''
  const inlineEntry = useMemo(() => (inlineSignature
    ? { help: JSON.parse(inlineSignature), settings: scope?.settings ?? null, app: scope?.app || appConfig?.app || 'platform', eventsDb: scope?.eventsDb || appConfig?.db || null }
    : null), [inlineSignature, scope, appConfig])
  const entry = scopeEntry || inlineEntry
  const popoverId = useId()
  const titleId = useId()
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [fieldFocused, setFieldFocused] = useState(false)
  const [fieldHovered, setFieldHovered] = useState(false)
  const [position, setPosition] = useState(null)
  const [vote, setVote] = useState(null)
  const [fieldRules, setFieldRules] = useState({})

  const close = useCallback((returnFocus) => {
    setOpen(false)
    setPosition(null)
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  const openHelp = useCallback(() => {
    setFieldRules(readFieldRules(htmlFor))
    setOpen(true)
    if (entry) recordFieldHelpOpen(entry.eventsDb, helpKey)
  }, [entry, helpKey, htmlFor])

  // Show ⓘ while the field itself has focus (D1).
  useEffect(() => {
    if (!entry || !htmlFor || typeof document === 'undefined') return undefined
    const field = document.getElementById(htmlFor)
    if (!field) return undefined
    // Focus or pointer over the field itself reveals ⓘ, so help is found without hovering the label.
    const onFocus = () => setFieldFocused(true)
    const onBlur = () => setFieldFocused(false)
    const onEnter = () => setFieldHovered(true)
    const onLeave = () => setFieldHovered(false)
    field.addEventListener('focus', onFocus)
    field.addEventListener('blur', onBlur)
    field.addEventListener('mouseenter', onEnter)
    field.addEventListener('mouseleave', onLeave)
    return () => {
      field.removeEventListener('focus', onFocus)
      field.removeEventListener('blur', onBlur)
      field.removeEventListener('mouseenter', onEnter)
      field.removeEventListener('mouseleave', onLeave)
    }
  }, [entry, htmlFor])

  // Place the card where it fits on screen (above or below the ⓘ); follow scroll / resize.
  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const card = popoverRef.current
    const height = card ? card.scrollHeight + 2 : null
    setPosition({
      ...computeHelpPopoverPlacement({ rect, height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }),
      measured: height != null,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return undefined
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  // Second pass once the card is on the page and its height is known.
  useLayoutEffect(() => {
    if (open && position && !position.measured) place()
  }, [open, position, place])

  // Escape closes; a click outside closes (WCAG 1.4.13 dismissible).
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true) } }
    const onDown = (e) => {
      if (popoverRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return
      close(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, close])

  // Point the field's description at the open popover (screen readers).
  useEffect(() => {
    if (!open || !htmlFor || typeof document === 'undefined') return undefined
    const field = document.getElementById(htmlFor)
    if (!field) return undefined
    const previous = field.getAttribute('aria-describedby')
    field.setAttribute('aria-describedby', [previous, popoverId].filter(Boolean).join(' '))
    return () => {
      if (previous) field.setAttribute('aria-describedby', previous)
      else field.removeAttribute('aria-describedby')
    }
  }, [open, htmlFor, popoverId])

  if (!entry) {
    return <Tag htmlFor={Tag === 'label' ? htmlFor : undefined} className={className}>{children}</Tag>
  }

  const { help, settings, app, eventsDb } = entry
  const doubleClickEnabled = !NO_DOUBLE_CLICK.has(control)
  // Props (when given) win over what is read from the field.
  const pick = (prop, live) => (prop === undefined ? live : prop)
  const rules = buildFieldHelpRules({
    required: pick(required, fieldRules.required),
    maxLength: pick(maxLength, fieldRules.maxLength),
    min: pick(min, fieldRules.min),
    max: pick(max, fieldRules.max),
    options: listOptions ? pick(options, fieldRules.options) : undefined,
    isAmount,
  })
  const learnMoreHref = buildLearnMoreHref({ kind: help.learn_more_kind, key: help.learn_more_key, app })

  const onMouseDown = (e) => {
    if (doubleClickEnabled && e.detail > 1) e.preventDefault() // no text selection on double-click
  }
  const onDoubleClick = (e) => {
    if (!doubleClickEnabled || popoverRef.current?.contains(e.target)) return
    e.preventDefault()
    window.getSelection?.()?.removeAllRanges?.()
    openHelp()
  }
  const castVote = async (helpful) => {
    setVote(helpful ? 'yes' : 'no')
    await recordFieldHelpVote(eventsDb, helpKey, helpful)
  }

  const revealed = open || fieldFocused || fieldHovered
  const { mode, labelNodes, fieldNodes } = partitionFieldLabelChildren(children, control)

  const helpButton = (
    <button
      ref={buttonRef}
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (open) close(false); else openHelp() }}
      aria-label={`Help: ${help.title}`}
      aria-expanded={open}
      aria-controls={open ? popoverId : undefined}
      aria-haspopup="dialog"
      className={`ml-1 inline-flex shrink-0 align-middle rounded-full p-0.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:opacity-100 group-hover/fieldhelp:opacity-100 transition-opacity ${revealed ? 'opacity-100' : 'opacity-0 pointer-coarse:opacity-60'}`}
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  )

  return (
    <Tag
      htmlFor={Tag === 'label' ? htmlFor : undefined}
      className={`group/fieldhelp ${className}`}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      data-help-key={helpKey}
    >
      {mode === 'inline' ? (
        <>
          {labelNodes}
          {helpButton}
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-x-0.5 max-w-full">
            <span>{labelNodes}</span>
            {helpButton}
          </span>
          {fieldNodes}
        </>
      )}
      {open && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-labelledby={titleId}
          data-side={position.side}
          style={{
            position: 'fixed', top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight,
            overflowY: 'auto', zIndex: 1000, visibility: position.measured ? 'visible' : 'hidden',
          }}
          className="rounded-lg border border-sky-200 dark:border-sky-800 border-l-4 border-l-sky-500 dark:border-l-sky-400 bg-sky-50 dark:bg-slate-900 shadow-xl p-4 space-y-3 text-left font-normal normal-case"
        >
          <div className="flex items-start justify-between gap-2">
            <p id={titleId} className="text-sm font-semibold text-gray-900 dark:text-white">{help.title}</p>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label="Close help"
              className="rounded p-0.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <Section heading="Purpose"><HelpText text={help.purpose} settings={settings} /></Section>
          {rules.length > 0 && (
            <Section heading="Rules">
              <ul className="list-disc pl-5 space-y-0.5">{rules.map((r) => <li key={r}>{r}</li>)}</ul>
            </Section>
          )}
          {help.examples && <Section heading="Examples"><HelpText text={help.examples} settings={settings} /></Section>}
          {help.format_notes && <Section heading="Format"><HelpText text={help.format_notes} settings={settings} /></Section>}
          {help.extra_notes && <Section heading="Notes"><HelpText text={help.extra_notes} settings={settings} /></Section>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-200 dark:border-sky-800 pt-2">
            {vote ? (
              <p className="text-xs text-gray-600 dark:text-gray-300">Thanks for your feedback.</p>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span>Was this helpful?</span>
                <button type="button" onClick={() => castVote(true)} className="rounded border border-sky-300 dark:border-sky-700 px-2 py-0.5 hover:bg-sky-100 dark:hover:bg-slate-800">Yes</button>
                <button type="button" onClick={() => castVote(false)} className="rounded border border-sky-300 dark:border-sky-700 px-2 py-0.5 hover:bg-sky-100 dark:hover:bg-slate-800">No</button>
              </div>
            )}
            {learnMoreHref && (
              <a href={learnMoreHref} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                Learn more
              </a>
            )}
          </div>
        </div>,
        document.body,
      )}
    </Tag>
  )
}

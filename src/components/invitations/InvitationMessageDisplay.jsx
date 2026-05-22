/**
 * Renders invitation personal messages on the accept page (markdown-lite, structured layout).
 */

import {
  prepareInvitationMessageForDisplay,
  splitMarkdownBoldParts,
  stripMarkdownBold,
} from '../../utils/invitationMessageEmailFormat'

const GENERIC_ORG_LINE = /^(our organisation|your organisation)$/i

function MarkdownInline({ text, className = '' }) {
  const parts = splitMarkdownBoldParts(text)
  return (
    <span className={className}>
      {parts.map((part, idx) =>
        part.type === 'bold' ? (
          <strong key={idx} className="font-semibold text-gray-900 dark:text-white">
            {part.value}
          </strong>
        ) : (
          <span key={idx}>{part.value}</span>
        ),
      )}
    </span>
  )
}

function SignOffBlock({ signOff, organisationName = '', inviteeDisplayName = '' }) {
  const inviteeName = String(inviteeDisplayName ?? '').trim()
  if (inviteeName) {
    const orgResolved = String(organisationName ?? '').trim()
    return (
      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-600 space-y-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 m-0">Kind regards,</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white m-0 leading-relaxed">
          {inviteeName}
        </p>
        {orgResolved ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0 leading-relaxed">{orgResolved}</p>
        ) : null}
      </div>
    )
  }

  const lines = signOff
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return null

  const nameLines = []
  let orgLine = null
  for (let i = 1; i < lines.length; i += 1) {
    const plain = stripMarkdownBold(lines[i])
    if (!orgLine && GENERIC_ORG_LINE.test(plain)) {
      const resolved = String(organisationName || '').trim()
      if (resolved) orgLine = resolved
      continue
    }
    if (!orgLine && i === lines.length - 1 && String(organisationName || '').trim()) {
      const resolved = String(organisationName).trim()
      if (plain === resolved || GENERIC_ORG_LINE.test(plain)) {
        orgLine = resolved
        continue
      }
    }
    nameLines.push(lines[i])
  }

  const orgResolved = String(organisationName || '').trim()
  if (!orgLine && orgResolved) {
    orgLine = orgResolved
  }

  return (
    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-600 space-y-1">
      <p className="text-sm text-gray-500 dark:text-gray-400 m-0">Kind regards,</p>
      {nameLines.map((line) => (
        <p
          key={line}
          className="text-sm font-semibold text-gray-900 dark:text-white m-0 leading-relaxed"
        >
          <MarkdownInline text={line} />
        </p>
      ))}
      {orgLine ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 m-0 leading-relaxed">{orgLine}</p>
      ) : null}
    </div>
  )
}

/**
 * @param {{
 *   message: string,
 *   organisationName?: string,
 *   inviterName?: string,
 *   inviteeDisplayName?: string,
 *   className?: string,
 * }} props
 */
export default function InvitationMessageDisplay({
  message,
  organisationName = '',
  inviterName = '',
  inviteeDisplayName = '',
  className = '',
}) {
  const trimmed = String(message ?? '').trim()
  if (!trimmed) return null

  const { body, expiry, signOff } = prepareInvitationMessageForDisplay(trimmed, {
    organisationName,
    skipRedundantIntro: true,
  })

  const hasContent = body.length > 0 || expiry || signOff
  if (!hasContent) return null

  const orgLabel = String(organisationName || '').trim()

  return (
    <section
      className={`rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 px-5 py-4 ${className}`}
      aria-label="Personal message from the inviter"
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 m-0 ${
          orgLabel ? 'mb-1' : 'mb-3'
        }`}
      >
        Message from your inviter
      </p>
      {orgLabel ? (
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 m-0 leading-relaxed">
          Sent by{' '}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {inviterName?.trim() || 'your project contact'}
          </span>
          {' '}on behalf of{' '}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {orgLabel}
          </span>
          .
        </p>
      ) : null}
      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {body.map((block) => (
          <p key={block.slice(0, 32)} className="m-0">
            <MarkdownInline text={block} />
          </p>
        ))}
        {expiry ? (
          <div
            className="rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-4 py-3"
            role="note"
          >
            <p className="m-0 text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
              <MarkdownInline text={expiry} />
            </p>
          </div>
        ) : null}
        {signOff ? (
          <SignOffBlock
            signOff={signOff}
            organisationName={organisationName}
            inviteeDisplayName={inviteeDisplayName}
          />
        ) : null}
      </div>
    </section>
  )
}

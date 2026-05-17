import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { resolveInvitationTemplatePlaceholders } from '../utils/resolveInvitationTemplatePlaceholders'
import { parseInvitationMessageBlocks, stripMarkdownBold } from '../../../utils/invitationMessageEmailFormat'
import { buildMockInvitationProjectContext } from '../../../services/invitationProjectContextService'
import ProjectContextPreview from './ProjectContextPreview'

/** Full email layout preview with resolved placeholders and hardcoded sender block. */
export default function TemplatePreviewPanel({ messageBody, sampleContext }) {
  const [show, setShow] = useState(false)

  const ctx = sampleContext || {}
  const projectContext = ctx.projectContext || buildMockInvitationProjectContext()
  const resolved = resolveInvitationTemplatePlaceholders(messageBody || '', { ...ctx, projectContext })
  const { body, expiry, signOff } = parseInvitationMessageBlocks(resolved, { skipRedundantIntro: true })

  const projectName    = ctx.projectName      || 'this project'
  const roleDisplay    = ctx.roleDisplayName  || 'this role'
  const inviterName    = ctx.inviterName      || 'the project team'
  const orgName        = ctx.organisationName || ''
  const expiryDays     = ctx.invitationExpiryDays ?? 14

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {show ? 'Hide email preview' : 'Show email preview'}
      </button>

      {show && (
        <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden text-sm shadow-sm">
          {/* Email header */}
          <div className="bg-blue-800 px-6 py-5">
            <p className="text-white font-bold text-lg leading-tight">Project Nidus</p>
            <p className="text-blue-200 text-xs mt-1">Project Management Platform</p>
          </div>

          {/* Email body */}
          <div className="bg-white dark:bg-gray-950 px-6 py-6 space-y-4">
            <h3 className="text-gray-900 dark:text-white font-semibold text-base">
              You've been invited!
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              <strong>{inviterName}</strong> has invited you to join{' '}
              <strong>{projectName}</strong> as a <strong>{roleDisplay}</strong>.
            </p>

            {/* Resolved template body (matches sent email layout) */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 px-5 py-4 text-sm space-y-3">
              {body.length ? (
                body.map((block) => (
                  <p key={block.slice(0, 24)} className="text-gray-700 dark:text-gray-300 leading-relaxed m-0">
                    {stripMarkdownBold(block)}
                  </p>
                ))
              ) : (
                <p className="text-gray-500 italic m-0">No additional message.</p>
              )}
              {expiry && (
                <p className="m-0 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-3 py-2 text-blue-900 dark:text-blue-100 text-sm leading-relaxed">
                  {stripMarkdownBold(expiry)}
                </p>
              )}
              {signOff && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 space-y-1">
                  <p className="m-0 text-sm">Kind regards,</p>
                  {signOff
                    .split(/\n/)
                    .slice(1)
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, idx) => (
                      <p
                        key={line}
                        className={`m-0 ${idx === 0 ? 'font-semibold text-gray-900 dark:text-white' : 'text-sm'}`}
                      >
                        {stripMarkdownBold(line)}
                      </p>
                    ))}
                </div>
              )}
            </div>

            <ProjectContextPreview projectContext={projectContext} />

            {/* Accept / Decline button mockup */}
            <div className="flex flex-wrap justify-center gap-3 py-2">
              <span className="inline-block border-2 border-red-600 text-red-600 text-sm font-semibold px-5 py-2.5 rounded-lg opacity-70 cursor-default">
                Decline Invitation
              </span>
              <span className="inline-block bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-lg opacity-70 cursor-default">
                Accept Invitation
              </span>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Expiry notice */}
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              This invitation expires in <strong>{expiryDays} days</strong>.
              If you didn't expect this email, you can safely ignore it.
            </p>

            {/* Sender block — always appended, anti-spam */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-4 space-y-1">
              <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-widest font-semibold mb-2">
                Invitation sent by
              </p>
              <div className="grid grid-cols-[90px_1fr] gap-y-1 text-xs">
                <span className="text-gray-500 dark:text-gray-400">Name</span>
                <span className="text-gray-900 dark:text-white font-semibold">{inviterName}</span>
                {orgName && (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">Organisation</span>
                    <span className="text-gray-800 dark:text-gray-200">{orgName}</span>
                  </>
                )}
                <span className="text-gray-500 dark:text-gray-400">Project</span>
                <span className="text-gray-800 dark:text-gray-200">{projectName}</span>
              </div>
            </div>
          </div>

          {/* Email footer */}
          <div className="bg-gray-100 dark:bg-gray-800 px-6 py-3 text-center">
            <p className="text-gray-400 text-xs">
              © {new Date().getFullYear()} Project Nidus. All rights reserved.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

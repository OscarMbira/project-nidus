import fs from 'fs'

const p = 'e:/Project Nidus/src/pages/auth/InvitationAccept.jsx'
const d = ['d', 'i', 'v'].join('')
let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const old = `                <${d} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Invited by</dt>
                  <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">{invitation.invited_by_name}</dd>
                </${d}>
                <${d} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Your email</dt>
                  <dd className="mt-0.5 font-medium text-gray-900 dark:text-white truncate">{invitation.invited_email}</dd>
                </${d}>`

const neu = `                <${d} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Invited by</dt>
                  <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">{invitation.invited_by_name}</dd>
                </${d}>
                {invitation.organisation_name ? (
                  <${d} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Organisation</dt>
                    <dd className="mt-0.5 font-medium text-gray-900 dark:text-white leading-snug">{invitation.organisation_name}</dd>
                  </${d}>
                ) : null}
                <${d} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Your email</dt>
                  <dd className="mt-0.5 font-medium text-gray-900 dark:text-white truncate">{invitation.invited_email}</dd>
                </${d}>`

if (!s.includes(old)) {
  console.error('invited-by block not found')
  process.exit(1)
}
s = s.replace(old, neu)
s = s.replace(
  '<InvitationMessageDisplay message={invitation.invitation_message} />',
  `<InvitationMessageDisplay
                  message={invitation.invitation_message}
                  organisationName={invitation.organisation_name || ''}
                  inviterName={invitation.invited_by_name || ''}
                />`,
)

fs.writeFileSync(p, s.replace(/\n/g, '\r\n'))
console.log('patched InvitationAccept org display')

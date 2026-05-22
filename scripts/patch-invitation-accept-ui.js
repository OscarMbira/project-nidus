import fs from 'fs'

const p = 'e:/Project Nidus/src/pages/auth/InvitationAccept.jsx'
let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const tag = ['d', 'i', 'v'].join('')

if (!s.includes('const expiresLabel')) {
  const anchor = '  return (\n    <' + tag + ' className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">'
  const insert = `  const expiresLabel = invitation?.expires_at
    ? new Date(invitation.expires_at).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

` + anchor.replace('py-12', 'py-10').replace('px-4">', 'px-4 sm:py-12">')
  if (!s.includes(anchor)) {
    console.error('anchor missing')
    process.exit(1)
  }
  s = s.replace(anchor, insert)
}

s = s.replace('max-w-md w-full space-y-8', 'max-w-lg w-full space-y-6')

s = s.replace(
  'rounded-lg shadow p-6 space-y-4',
  'rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden',
)

const innerOld = `            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {invitation.project_name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Role: {invitation.role_display_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Invited by: {invitation.invited_by_name}
              </p>
            </div>`

const innerNew = `            <${tag} className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
              <${tag} className="flex items-start gap-3">
                <Briefcase className="h-6 w-6 flex-shrink-0 mt-0.5 opacity-90" aria-hidden />
                <${tag} className="min-w-0">
                  <h2 className="text-lg font-semibold leading-snug">{invitation.project_name}</h2>
                  <p className="mt-1 text-sm text-blue-100">
                    You&apos;ve been invited as{' '}
                    <span className="font-medium text-white">{invitation.role_display_name}</span>
                  </p>
                </${tag}>
              </${tag}>
            </${tag}>
            <${tag} className="px-6 py-5 space-y-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <${tag} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Invited by</dt>
                  <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">{invitation.invited_by_name}</dd>
                </${tag}>
                <${tag} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Your email</dt>
                  <dd className="mt-0.5 font-medium text-gray-900 dark:text-white truncate">{invitation.invited_email}</dd>
                </${tag}>
                {expiresLabel ? (
                  <${tag} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700 sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden />
                      Invitation expires
                    </dt>
                    <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">{expiresLabel}</dd>
                  </${tag}>
                ) : null}
              </dl>`

if (!s.includes(innerOld)) {
  console.error('inner block not found')
  process.exit(1)
}
s = s.replace(innerOld, innerNew)

s = s.replace(
  `              {invitation.invitation_message ? (
                <InvitationMessageDisplay message={invitation.invitation_message} />
              ) : null}

            {error && (`,
  `              {invitation.invitation_message ? (
                <InvitationMessageDisplay message={invitation.invitation_message} />
              ) : null}

            <${tag} className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-5 px-6 pb-2">
            {error && (`,
)

s = s.replace(
  `            <${tag} className="text-center">
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Already have an account? Sign in
              </Link>
            </${tag}>
          </${tag}>
        )}`,
  `            </${tag}>

            <${tag} className="text-center border-t border-gray-200 dark:border-gray-700 pt-4 px-6 pb-6">
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Already have an account? Sign in
              </Link>
            </${tag}>
          </${tag}>
        )}`,
)

s = s.replace(
  'Project Invitation',
  'Project invitation',
)
s = s.replace(
  `You've been invited to join a project`,
  `Review the details below, then accept to join the project or decline if this was not expected.`,
)
s = s.replace(
  '<h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">',
  '<h1 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">',
)
s = s.replace(
  'Project invitation\n          </h2>',
  'Project invitation\n          </h1>',
)
s = s.replace(
  'mt-2 text-sm text-gray-600 dark:text-gray-400">',
  'mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">',
  1,
)

s = s.replace(
  '<form onSubmit={handleAccept} className="space-y-4">\n                <div>\n                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">\n                    Set Password',
  `<form onSubmit={handleAccept} className="space-y-4 px-6">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Create your account</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Use the email this invitation was sent to. Choose a secure password to continue.</p>
                <${tag}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Set password`,
)

s = s.replace('Confirm Password', 'Confirm password')

fs.writeFileSync(p, s.replace(/\n/g, '\r\n'))
console.log('patched ok')

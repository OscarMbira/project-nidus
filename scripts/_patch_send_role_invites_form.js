const fs = require('fs')
const p = 'src/pages/admin/SendRoleInvites.jsx'
const d = 'motion.div'
const D = 'div'
let s = fs.readFileSync(p, 'utf8')
const start = s.indexOf('            <form onSubmit={handleSendInvite}')
const endMarker = s.indexOf('                  Message (Optional)')
if (start < 0 || endMarker < 0) {
  console.error('markers not found', start, endMarker)
  process.exit(1)
}
const lineStart = s.lastIndexOf('\n', endMarker) + 1
// back up to opening <div> for message section
const msgBlockStart = s.lastIndexOf('              <', endMarker)

let block = fs.readFileSync('scripts/_patch_send_role_invites_form_fragment.txt', 'utf8')
block = block.split('__DIV__').join(D)

s = s.slice(0, start) + block + s.slice(msgBlockStart)
fs.writeFileSync(p, s)
console.log('patched', p)

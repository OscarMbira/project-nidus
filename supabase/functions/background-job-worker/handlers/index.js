/**
 * v1352 — handler registry: catalogue job code → handler module (rule 80). One file per code, named
 * <code>.js. scripts/check-background-jobs.mjs fails when a catalogue handler job has no file here.
 */
import * as aiEmbed from './ai.embed.js'
import * as draftsExpire from './drafts.expire.js'
import * as testersMoratoriumExpiry from './testers.moratorium_expiry.js'
import * as systemAlertEmail from './system.alert_email.js'
import * as reportsHealthSend from './reports.health_send.js'
import * as notificationsDigestSend from './notifications.digest_send.js'
import * as billingOverdueReminders from './billing.overdue_reminders.js'
import * as billingScheduleDue from './billing.schedule_due.js'

export const handlers = {
  'ai.embed': aiEmbed,
  'drafts.expire': draftsExpire,
  'testers.moratorium_expiry': testersMoratoriumExpiry,
  'system.alert_email': systemAlertEmail,
  'reports.health_send': reportsHealthSend,
  'notifications.digest_send': notificationsDigestSend,
  'billing.overdue_reminders': billingOverdueReminders,
  'billing.schedule_due': billingScheduleDue,
}

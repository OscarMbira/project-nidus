/**
 * Daily Log Reminder Service
 * Provides reminder functionality for daily log entries
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Create a reminder for an entry
 * @param {string} entryId - Entry ID
 * @param {string} reminderDate - Reminder date (YYYY-MM-DD)
 * @param {string} reminderType - Reminder type ('email', 'notification', 'both')
 * @returns {Promise<Object>} Created reminder
 */
export async function createReminder(entryId, reminderDate, reminderType = 'both') {
  try {
    const { data, error } = await platformDb
      .from('daily_log_reminders')
      .insert({
        entry_id: entryId,
        reminder_date: reminderDate,
        reminder_type: reminderType,
        reminder_sent: false
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating reminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a reminder
 * @param {string} reminderId - Reminder ID
 * @returns {Promise<Object>} Result
 */
export async function deleteReminder(reminderId) {
  try {
    const { error } = await platformDb
      .from('daily_log_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get upcoming reminders for a user
 * @param {string} userId - User ID
 * @param {number} daysAhead - Number of days ahead to look (default 7)
 * @returns {Promise<Object>} Upcoming reminders
 */
export async function getUpcomingReminders(userId, daysAhead = 7) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await platformDb
      .from('daily_log_reminders')
      .select(`
        *,
        entry:daily_log_entries!inner(
          id,
          entry_number,
          description,
          target_date,
          person_responsible_id,
          daily_log:daily_log_id(
            id,
            project_id,
            projects:project_id(id, project_name, project_code)
          )
        )
      `)
      .eq('entry.person_responsible_id', userId)
      .gte('reminder_date', today)
      .lte('reminder_date', futureDateStr)
      .eq('reminder_sent', false)
      .order('reminder_date', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting upcoming reminders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process reminders (for cron job)
 * Finds reminders that are due and sends notifications
 * @returns {Promise<Object>} Processed reminders
 */
export async function processReminders() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get reminders due today that haven't been sent
    const { data: reminders, error: fetchError } = await platformDb
      .from('daily_log_reminders')
      .select(`
        *,
        entry:daily_log_entries!inner(
          id,
          entry_number,
          description,
          target_date,
          person_responsible_id,
          person_responsible:person_responsible_id(id, full_name, email),
          daily_log:daily_log_id(
            id,
            project_id,
            projects:project_id(id, project_name, project_code)
          )
        )
      `)
      .eq('reminder_date', today)
      .eq('reminder_sent', false);

    if (fetchError) throw fetchError;

    const processed = [];

    // Mark reminders as sent and trigger notifications
    for (const reminder of reminders || []) {
      // Update reminder as sent
      const { error: updateError } = await platformDb
        .from('daily_log_reminders')
        .update({ reminder_sent: true })
        .eq('id', reminder.id);

      if (updateError) {
        console.error(`Error updating reminder ${reminder.id}:`, updateError);
        continue;
      }

      // TODO: Send email/notification based on reminder_type
      // This would integrate with notification service
      // if (reminder.reminder_type === 'email' || reminder.reminder_type === 'both') {
      //   await sendReminderEmail(reminder);
      // }
      // if (reminder.reminder_type === 'notification' || reminder.reminder_type === 'both') {
      //   await createNotification(reminder);
      // }

      processed.push(reminder);
    }

    return { success: true, data: { processed: processed.length, reminders: processed } };
  } catch (error) {
    console.error('Error processing reminders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get reminders for an entry
 * @param {string} entryId - Entry ID
 * @returns {Promise<Object>} Reminders
 */
export async function getRemindersForEntry(entryId) {
  try {
    const { data, error } = await platformDb
      .from('daily_log_reminders')
      .select('*')
      .eq('entry_id', entryId)
      .order('reminder_date', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting reminders for entry:', error);
    return { success: false, error: error.message };
  }
}

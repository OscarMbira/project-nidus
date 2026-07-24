/**
 * Lessons Report Distribution Service
 * Manages distribution list for Lessons Reports
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add distribution recipient
 * @param {string} reportId - Report ID
 * @param {Object} recipientData - Recipient data
 * @returns {Promise<Object>} Created distribution record
 */
export async function addDistributionRecipient(reportId, recipientData) {
  try {
    // Get report version for version_distributed
    const { data: report } = await platformDb
      .from('lessons_reports')
      .select('version_no')
      .eq('id', reportId)
      .single();

    const distribution = {
      lessons_report_id: reportId,
      recipient_id: recipientData.recipient_id || null,
      recipient_name: recipientData.recipient_name || '',
      recipient_email: recipientData.recipient_email || null,
      recipient_title: recipientData.recipient_title || null,
      recipient_role: recipientData.recipient_role || null,
      date_distributed: recipientData.date_distributed || new Date().toISOString().split('T')[0],
      version_distributed: recipientData.version_distributed || report?.version_no || '1.0',
      distribution_method: recipientData.distribution_method || 'system',
      distribution_status: 'sent'
    };

    const { data, error } = await platformDb
      .from('lessons_report_distribution')
      .insert(distribution)
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding distribution recipient:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove distribution recipient
 * @param {string} distributionId - Distribution ID
 * @returns {Promise<Object>} Result
 */
export async function removeDistributionRecipient(distributionId) {
  try {
    const { error } = await platformDb
      .from('lessons_report_distribution')
      .delete()
      .eq('id', distributionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing distribution recipient:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get distribution list
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Distribution list
 */
export async function getDistributionList(reportId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_distribution')
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .eq('lessons_report_id', reportId)
      .order('date_distributed', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching distribution list:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send report to distribution
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Result
 */
export async function sendReportToDistribution(reportId) {
  try {
    // Get distribution list
    const distributionResult = await getDistributionList(reportId);
    if (!distributionResult.success) {
      return { success: false, error: 'Error fetching distribution list' };
    }

    const recipients = distributionResult.data || [];
    
    if (recipients.length === 0) {
      return { success: false, error: 'No recipients in distribution list' };
    }

    // Update all recipients to 'sent' status and set date
    const today = new Date().toISOString().split('T')[0];
    const updatePromises = recipients.map(recipient =>
      platformDb
        .from('lessons_report_distribution')
        .update({
          distribution_status: 'sent',
          date_distributed: today
        })
        .eq('id', recipient.id)
    );

    await Promise.all(updatePromises);

    // Update report status to 'distributed'
    await platformDb
      .from('lessons_reports')
      .update({
        report_status: 'distributed'
      })
      .eq('id', reportId);

    // TODO: Send email notifications here
    // await sendDistributionNotifications(reportId, recipients);

    return { success: true, data: { recipients_count: recipients.length } };
  } catch (error) {
    console.error('Error sending report to distribution:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Track distribution status
 * @param {string} distributionId - Distribution ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated distribution
 */
export async function trackDistributionStatus(distributionId, status) {
  try {
    const updates = {
      distribution_status: status
    };

    if (status === 'delivered') {
      // Update delivered timestamp
      updates.delivered_at = new Date().toISOString();
    }

    const { data, error } = await platformDb
      .from('lessons_report_distribution')
      .update(updates)
      .eq('id', distributionId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error tracking distribution status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Acknowledge receipt
 * @param {string} distributionId - Distribution ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated distribution
 */
export async function acknowledgeReceipt(distributionId, userId) {
  try {
    const { data, error } = await platformDb
      .from('lessons_report_distribution')
      .update({
        distribution_status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', distributionId)
      .eq('recipient_id', userId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error acknowledging receipt:', error);
    return { success: false, error: error.message };
  }
}

export default {
  addDistributionRecipient,
  removeDistributionRecipient,
  getDistributionList,
  sendReportToDistribution,
  trackDistributionStatus,
  acknowledgeReceipt
};

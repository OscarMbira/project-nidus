import { supabase } from './supabaseClient';

/**
 * Issue Report Distribution Service - API functions for Issue Report Distribution
 * Handles distribution list management for Issue Reports
 */

/**
 * Add a distribution recipient to an Issue Report
 * @param {string} reportId - Report ID
 * @param {Object} recipientData - Recipient data
 * @returns {Promise<Object>} Created distribution record
 */
export async function addDistributionRecipient(reportId, recipientData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get report version for version_distributed
    const { data: report } = await supabase
      .from('issue_reports')
      .select('version_no')
      .eq('id', reportId)
      .single();

    const insertData = {
      ...recipientData,
      issue_report_id: reportId,
      version_distributed: recipientData.version_distributed || report?.version_no || '1.0',
      distribution_status: 'sent',
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('issue_report_distribution')
      .insert(insertData)
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding distribution recipient:', error);
    throw error;
  }
}

/**
 * Remove a distribution recipient
 * @param {string} distributionId - Distribution ID
 * @returns {Promise<void>}
 */
export async function removeDistributionRecipient(distributionId) {
  try {
    const { error } = await supabase
      .from('issue_report_distribution')
      .delete()
      .eq('id', distributionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing distribution recipient:', error);
    throw error;
  }
}

/**
 * Get distribution list for a report
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of distribution records
 */
export async function getDistributionList(reportId) {
  try {
    const { data, error } = await supabase
      .from('issue_report_distribution')
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .eq('issue_report_id', reportId)
      .order('date_distributed', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching distribution list:', error);
    throw error;
  }
}

/**
 * Send report to distribution list
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export async function sendReportToDistribution(reportId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get distribution list
    const distributionList = await getDistributionList(reportId);

    if (distributionList.length === 0) {
      throw new Error('No distribution recipients found');
    }

    // Update all distribution records with date_distributed
    const distributionIds = distributionList.map(d => d.id);
    const { error: updateError } = await supabase
      .from('issue_report_distribution')
      .update({
        date_distributed: new Date().toISOString().split('T')[0],
        distribution_status: 'sent',
        updated_at: new Date().toISOString()
      })
      .in('id', distributionIds);

    if (updateError) throw updateError;

    // Update report status to distributed
    const { error: reportError } = await supabase
      .from('issue_reports')
      .update({ report_status: 'distributed' })
      .eq('id', reportId);

    if (reportError) throw reportError;

    // Send email notifications to recipients
    try {
      const { notifyDistribution } = await import('./issueReportNotificationService');
      await notifyDistribution(reportId);
    } catch (notifError) {
      console.error('Error sending distribution notifications:', notifError);
      // Don't fail distribution if notification fails
    }
  } catch (error) {
    console.error('Error sending report to distribution:', error);
    throw error;
  }
}

/**
 * Track distribution status
 * @param {string} distributionId - Distribution ID
 * @param {string} status - New status ('sent', 'delivered', 'read', 'acknowledged')
 * @returns {Promise<Object>} Updated distribution record
 */
export async function trackDistributionStatus(distributionId, status) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const updateData = {
      distribution_status: status,
      updated_by: userData.id
    };

    // Set read_at if status is 'read'
    if (status === 'read') {
      updateData.read_at = new Date().toISOString();
    }

    // Set acknowledged_at if status is 'acknowledged'
    if (status === 'acknowledged') {
      updateData.acknowledged_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('issue_report_distribution')
      .update(updateData)
      .eq('id', distributionId)
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error tracking distribution status:', error);
    throw error;
  }
}

/**
 * Acknowledge receipt of report
 * @param {string} distributionId - Distribution ID
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<Object>} Updated distribution record
 */
export async function acknowledgeReceipt(distributionId, userId = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', userId || user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const { data, error } = await supabase
      .from('issue_report_distribution')
      .update({
        distribution_status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        updated_by: userData.id
      })
      .eq('id', distributionId)
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error acknowledging receipt:', error);
    throw error;
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

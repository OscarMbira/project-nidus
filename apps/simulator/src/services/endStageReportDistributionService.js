/**
 * End Stage Report Distribution Service
 * Manages distribution list and sending
 */

import { supabase } from './supabaseClient'

/**
 * Add Distribution Recipient
 * @param {string} reportId - Report ID
 * @param {Object} recipientData - Recipient data
 * @returns {Promise<Object>} Created distribution record
 */
export async function addDistributionRecipient(reportId, recipientData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get recipient details if user_id provided
    let recipientName = recipientData.recipient_name
    let recipientEmail = recipientData.recipient_email
    let recipientTitle = recipientData.recipient_title
    let recipientRole = recipientData.recipient_role

    if (recipientData.recipient_id) {
      const { data: user } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', recipientData.recipient_id)
        .single()

      if (user) {
        recipientName = recipientName || user.full_name
        recipientEmail = recipientEmail || user.email
      }
    }

    // Get report version
    const { data: report } = await supabase
      .from('end_stage_reports')
      .select('version_no')
      .eq('id', reportId)
      .single()

    const insertData = {
      end_stage_report_id: reportId,
      recipient_id: recipientData.recipient_id || null,
      recipient_name: recipientName || 'Unknown',
      recipient_email: recipientEmail || null,
      recipient_title: recipientTitle || null,
      recipient_role: recipientRole || null,
      date_of_issue: recipientData.date_of_issue || new Date().toISOString().split('T')[0],
      version_distributed: report?.version_no || '1.0',
      distribution_status: 'sent'
    }

    const { data, error } = await supabase
      .from('end_stage_report_distribution')
      .insert(insertData)
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding distribution recipient:', error)
    throw error
  }
}

/**
 * Remove Distribution Recipient
 * @param {string} distributionId - Distribution ID
 * @returns {Promise<void>}
 */
export async function removeDistributionRecipient(distributionId) {
  try {
    const { error } = await supabase
      .from('end_stage_report_distribution')
      .delete()
      .eq('id', distributionId)

    if (error) throw error
  } catch (error) {
    console.error('Error removing distribution recipient:', error)
    throw error
  }
}

/**
 * Get Distribution List
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Distribution list
 */
export async function getDistributionList(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_stage_report_distribution')
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .eq('end_stage_report_id', reportId)
      .order('date_of_issue', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching distribution list:', error)
    throw error
  }
}

/**
 * Send Report to Distribution
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Distribution summary
 */
export async function sendReportToDistribution(reportId) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get distribution list
    const distributionList = await getDistributionList(reportId)

    if (distributionList.length === 0) {
      throw new Error('No recipients in distribution list')
    }

    // Update all distribution records to 'sent' status
    const today = new Date().toISOString().split('T')[0]
    
    for (const dist of distributionList) {
      await supabase
        .from('end_stage_report_distribution')
        .update({
          distribution_status: 'sent',
          date_of_issue: today
        })
        .eq('id', dist.id)
    }

    // Update report distribution_list JSONB field
    const distributionSummary = distributionList.map(d => ({
      user_id: d.recipient_id,
      name: d.recipient_name,
      email: d.recipient_email,
      role: d.recipient_role,
      date_sent: today,
      status: 'sent'
    }))

    await supabase
      .from('end_stage_reports')
      .update({
        distribution_list: distributionSummary
      })
      .eq('id', reportId)

    return {
      sent: distributionList.length,
      recipients: distributionList.map(d => d.recipient_name || d.recipient_email)
    }
  } catch (error) {
    console.error('Error sending report to distribution:', error)
    throw error
  }
}

/**
 * Track Distribution Status
 * @param {string} distributionId - Distribution ID
 * @param {string} status - New status ('sent', 'read', 'acknowledged')
 * @returns {Promise<Object>} Updated distribution record
 */
export async function trackDistributionStatus(distributionId, status) {
  try {
    const updateData = {
      distribution_status: status
    }

    if (status === 'acknowledged') {
      updateData.acknowledgment_date = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('end_stage_report_distribution')
      .update(updateData)
      .eq('id', distributionId)
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error tracking distribution status:', error)
    throw error
  }
}

/**
 * Acknowledge Receipt
 * @param {string} distributionId - Distribution ID
 * @param {string} userId - User ID (optional, uses current user if not provided)
 * @returns {Promise<Object>} Updated distribution record
 */
export async function acknowledgeReceipt(distributionId, userId = null) {
  try {
    if (!userId) {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        throw new Error('User not authenticated')
      }
      userId = userData.user.id
    }

    // Verify user is the recipient
    const { data: distribution } = await supabase
      .from('end_stage_report_distribution')
      .select('recipient_id')
      .eq('id', distributionId)
      .single()

    if (distribution.recipient_id !== userId) {
      throw new Error('Only the recipient can acknowledge receipt')
    }

    return await trackDistributionStatus(distributionId, 'acknowledged')
  } catch (error) {
    console.error('Error acknowledging receipt:', error)
    throw error
  }
}

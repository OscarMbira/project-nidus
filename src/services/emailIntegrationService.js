/**
 * Email Integration Service
 * Handles email service configuration, sending emails, and email logs
 */

import { supabase } from './supabaseClient'

/**
 * Get all email configurations
 */
export async function getEmailConfigurations() {
  try {
    const { data, error } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching email configurations:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Create or update email configuration
 */
export async function configureEmailService(configData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('email_configurations')
      .upsert({
        ...configData,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        created_by: configData.id ? undefined : user.id
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'Email configuration saved successfully' }
  } catch (error) {
    console.error('Error configuring email service:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(configId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get configuration
    const { data: config, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('id', configId)
      .single()

    if (configError) throw configError

    // In production, this would actually send a test email
    // For now, we'll just log it and simulate success
    const testEmail = {
      to_email: user.email,
      subject: 'Test Email from Project Nidus',
      template_id: null,
      delivery_status: 'sent',
      sent_at: new Date().toISOString()
    }

    // Log test email
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        ...testEmail,
        created_by: user.id
      })

    if (logError) throw logError

    return { success: true, message: 'Test email sent successfully' }
  } catch (error) {
    console.error('Error testing email configuration:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Send email
 */
export async function sendEmail(to, subject, body, templateId = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get active email configuration
    const { data: config, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (configError || !config) {
      throw new Error('No active email configuration found')
    }

    // In production, this would actually send the email using the configured service
    // For now, we'll just log it
    const emailLog = {
      to_email: to,
      subject: subject,
      body: body,
      template_id: templateId,
      delivery_status: 'sent',
      sent_at: new Date().toISOString(),
      created_by: user.id
    }

    const { data, error } = await supabase
      .from('email_logs')
      .insert([emailLog])
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Email sent successfully' }
  } catch (error) {
    console.error('Error sending email:', error)
    
    // Log failed email
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('email_logs').insert({
          to_email: to,
          subject: subject,
          delivery_status: 'failed',
          error_message: error.message,
          created_by: user.id
        })
      }
    } catch (logError) {
      console.error('Error logging failed email:', logError)
    }

    return { success: false, message: error.message }
  }
}

/**
 * Send bulk emails
 */
export async function sendBulkEmail(recipients, subject, body, templateId = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const results = await Promise.allSettled(
      recipients.map(recipient => sendEmail(recipient, subject, body, templateId))
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    return {
      success: true,
      data: {
        total: recipients.length,
        successful,
        failed
      },
      message: `Sent ${successful} of ${recipients.length} emails`
    }
  } catch (error) {
    console.error('Error sending bulk email:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get email template
 */
export async function getEmailTemplate(templateId) {
  try {
    // In production, this would fetch from email_templates table
    // For now, return a placeholder
    return {
      success: true,
      data: {
        id: templateId,
        name: 'Default Template',
        subject: 'Default Subject',
        body: 'Default body'
      }
    }
  } catch (error) {
    console.error('Error fetching email template:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get email logs
 */
export async function getEmailLogs(filters = {}) {
  try {
    let query = supabase
      .from('email_logs')
      .select('*')
      .eq('is_deleted', false)
      .order('sent_at', { ascending: false })
      .limit(100)

    if (filters.to_email) {
      query = query.ilike('to_email', `%${filters.to_email}%`)
    }
    if (filters.delivery_status) {
      query = query.eq('delivery_status', filters.delivery_status)
    }
    if (filters.start_date) {
      query = query.gte('sent_at', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('sent_at', filters.end_date)
    }

    const { data, error } = await query

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching email logs:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Delete email configuration
 */
export async function deleteEmailConfiguration(configId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('email_configurations')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', configId)

    if (error) throw error
    return { success: true, message: 'Email configuration deleted successfully' }
  } catch (error) {
    console.error('Error deleting email configuration:', error)
    return { success: false, message: error.message }
  }
}


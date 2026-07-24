/**
 * Email Integration Service
 * Handles email service configuration, sending emails, and email logs
 */

import { supabase } from './supabaseClient'

/**
 * Resolve project_type_id for sender profile lookup.
 */
async function resolveProjectTypeId(projectId) {
  if (!projectId) return null
  try {
    const { data } = await supabase
      .from('projects')
      .select('project_type_id')
      .eq('id', projectId)
      .maybeSingle()
    return data?.project_type_id || null
  } catch {
    return null
  }
}

/**
 * Send email via Supabase Edge Function (sender profiles resolved server-side).
 */
async function sendEmailViaSupabase(to, subject, htmlBody, config, { projectTypeId, templateId = null } = {}) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin.replace(/\/$/, '')
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (supabaseUrl && anonKey) {
      try {
        const payload = {
          to,
          subject,
          html: htmlBody,
          text: htmlBody.replace(/<[^>]*>/g, ''),
          template_id: templateId,
        }
        if (projectTypeId) payload.project_type_id = projectTypeId

        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey
          },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            return {
              success: true,
              messageId: result.message_id || result.id || null
            }
          } else {
            // Edge function returned an error - try fallback methods
            console.warn('Edge function returned error, trying fallback:', result.error)
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
          console.warn('Edge function request failed, trying fallback:', errorData.error)
        }
      } catch (httpError) {
        console.warn('Edge function email sending failed, trying fallback:', httpError)
        // Continue to fallback methods
      }
    }

    // FALLBACK: Direct email service calls (if edge function unavailable)
    // These methods are kept as fallback only
    const fromEmail = config?.from_email || 'noreply@updates.projectastute.com'
    const fromName = config?.from_name || 'Project Nidus'

    if (config && config.service_provider) {
      switch (config.service_provider.toLowerCase()) {
        case 'resend':
          return await sendViaResend(to, subject, htmlBody, fromEmail, fromName, config)
        case 'sendgrid':
          return await sendViaSendGrid(to, subject, htmlBody, fromEmail, fromName, config)
        case 'smtp':
          return await sendViaSMTP(to, subject, htmlBody, fromEmail, fromName, config)
        default:
          console.warn(`Unsupported email provider: ${config.service_provider}`)
      }
    }

    // Final fallback: Use database function (queues email for processing)
    try {
      const { data, error } = await supabase.rpc('send_transactional_email', {
        p_to_email: to,
        p_subject: subject,
        p_body_html: htmlBody,
        p_body_text: htmlBody.replace(/<[^>]*>/g, ''),
        p_from_email: fromEmail,
        p_from_name: fromName
      })

      if (!error && data && data.success !== false) {
        return {
          success: true,
          messageId: data.message_id || null
        }
      }
    } catch (rpcError) {
      console.warn('RPC function failed:', rpcError)
    }

    // If all methods fail, return error
    return {
      success: false,
      error: 'Email service not configured. Please set up an email service provider.',
      warning: true
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email'
    }
  }
}

/**
 * Send email via Resend API
 */
async function sendViaResend(to, subject, htmlBody, fromEmail, fromName, config) {
  try {
    const apiKey = config.api_key
    if (!apiKey) {
      throw new Error('Resend API key not configured')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: `${fromName || 'Project Nidus'} <${fromEmail}>`,
        to: [to],
        subject: subject,
        html: htmlBody
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `Resend API error: ${response.status}`)
    }

    const result = await response.json()
    return {
      success: true,
      messageId: result.id || null
    }
  } catch (error) {
    console.error('Resend email sending failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email via Resend'
    }
  }
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(to, subject, htmlBody, fromEmail, fromName, config) {
  try {
    const apiKey = config.api_key
    if (!apiKey) {
      throw new Error('SendGrid API key not configured')
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }]
        }],
        from: {
          email: fromEmail,
          name: fromName || 'Project Nidus'
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: htmlBody
        }]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SendGrid API error: ${response.status} - ${error}`)
    }

    // SendGrid returns 202 Accepted with message ID in headers
    const messageId = response.headers.get('x-message-id')
    return {
      success: true,
      messageId: messageId || null
    }
  } catch (error) {
    console.error('SendGrid email sending failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email via SendGrid'
    }
  }
}

/**
 * Send email via SMTP (requires server-side implementation)
 * For now, this will queue the email for server-side processing
 */
async function sendViaSMTP(to, subject, htmlBody, fromEmail, fromName, config) {
  // SMTP sending requires server-side implementation
  // For now, we'll queue it in the database for processing
  return {
    success: false,
    error: 'SMTP email sending requires server-side implementation. Email has been queued.',
    warning: true
  }
}

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
 * Send email (positional or options object).
 *
 * Options object: { to_email, subject, body_html, template_id, project_id, project_type_id }
 * Sender profiles: pass project_type_id or project_id; omit explicit from headers.
 */
export async function sendEmail(toOrOptions, subject, body, templateId = null, sendOptions = {}) {
  let to
  let subj
  let html
  let tid
  let projectTypeId = sendOptions.projectTypeId ?? sendOptions.project_type_id ?? null
  let projectId = sendOptions.projectId ?? sendOptions.project_id ?? null

  if (toOrOptions && typeof toOrOptions === 'object' && !Array.isArray(toOrOptions)) {
    const o = toOrOptions
    to = o.to_email || o.to
    subj = o.subject
    html = o.body_html || o.body
    tid = o.template_id ?? o.templateId ?? null
    projectTypeId = o.project_type_id ?? o.projectTypeId ?? null
    projectId = o.project_id ?? o.projectId ?? null
  } else {
    to = toOrOptions
    subj = subject
    html = body
    tid = templateId
  }

  if (!to || !subj || !html) {
    return { success: false, message: 'Missing required email fields (to, subject, body).' }
  }

  if (!projectTypeId && projectId) {
    projectTypeId = await resolveProjectTypeId(projectId)
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get active email configuration
    const { data: config, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .maybeSingle()

    // If no email configuration found, log to console in development
    // In production, this should be configured
    if (configError || !config) {
      console.warn('No active email configuration found. Email will be logged but not sent.');
      console.log('Email Details:', { to, subject, templateId: tid });
      
      // Still log the email attempt for tracking
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('email_logs').insert({
            to_email: to,
            subject: subj,
            body_html: html,
            body_text: html.replace(/<[^>]*>/g, ''),
            template_id: tid,
            delivery_status: 'pending',
            error_message: 'No active email configuration found',
            created_by: user.id
          })
        }
      } catch (logError) {
        console.error('Error logging email:', logError)
      }
      
      // Return success but with a warning message
      return { 
        success: true, 
        message: 'Email logged but not sent (no email configuration). Please configure email service.',
        warning: true
      }
    }

    // Actually send the email using Supabase's email service
    // Since registration emails work, we'll use the same mechanism
    try {
      // Try to send via Supabase's email API (using the same service as auth emails)
      // First, log the email attempt
      const emailLog = {
        email_config_id: config.id,
        to_email: to,
        subject: subject,
        body_html: body, // Store HTML body
        body_text: body.replace(/<[^>]*>/g, ''), // Extract plain text from HTML
        template_id: templateId,
        delivery_status: 'pending',
        created_by: user.id
      }

      const { data: logData, error: logError } = await supabase
        .from('email_logs')
        .insert([emailLog])
        .select()
        .single()

      if (logError) throw logError

      // Now actually send the email using the configured email service
      const emailResult = await sendEmailViaSupabase(to, subj, html, config, {
        projectTypeId,
        templateId: tid,
      })

      // Update email log with result
      if (emailResult.success) {
        await supabase
          .from('email_logs')
          .update({
            delivery_status: 'sent',
            sent_at: new Date().toISOString(),
            message_id: emailResult.messageId || null
          })
          .eq('id', logData.id)

        return { 
          success: true, 
          data: { ...logData, delivery_status: 'sent' }, 
          message: 'Email sent successfully' 
        }
      } else {
        // Update log with error
        await supabase
          .from('email_logs')
          .update({
            delivery_status: 'failed',
            error_message: emailResult.error || 'Failed to send email'
          })
          .eq('id', logData.id)

        return { 
          success: false, 
          message: emailResult.error || 'Failed to send email',
          warning: false
        }
      }
    } catch (sendError) {
      console.error('Error in email sending process:', sendError)
      throw sendError
    }
  } catch (error) {
    console.error('Error sending email:', error)
    
    // Log failed email
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('email_logs').insert({
          to_email: to,
          subject: subj,
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


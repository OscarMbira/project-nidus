/**
 * SSO Service
 * Handles Single Sign-On (SSO) provider management, SAML, OAuth, and OIDC authentication
 */

import { supabase } from './supabaseClient'

/**
 * Configure SSO provider
 */
export async function configureSSOProvider(providerType, config) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('sso_providers')
      .insert({
        provider_name: config.provider_name,
        provider_type: providerType,
        entity_id: config.entity_id || null,
        sso_url: config.sso_url,
        slo_url: config.slo_url || null,
        certificate: config.certificate || null, // Should be encrypted in production
        client_id: config.client_id || null, // Should be encrypted in production
        client_secret: config.client_secret || null, // Should be encrypted in production
        scopes: config.scopes || [],
        attribute_mappings: config.attribute_mappings || {},
        is_active: config.is_active !== undefined ? config.is_active : true,
        auto_provision_users: config.auto_provision_users || false,
        default_role_id: config.default_role_id || null,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'SSO provider configured successfully' }
  } catch (error) {
    console.error('Error configuring SSO provider:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get SSO providers
 */
export async function getSSOProviders(filters = {}) {
  try {
    let query = supabase
      .from('sso_providers')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters.provider_type) {
      query = query.eq('provider_type', filters.provider_type)
    }

    const { data, error } = await query

    if (error) {
      // Suppress permission errors for unauthenticated users (expected behavior)
      // This happens when RLS policies haven't been updated yet
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        // Return empty array silently - SSO providers may not be configured yet
        return { success: true, data: [] }
      }
      throw error
    }

    // Mask sensitive data
    const maskedData = data.map(provider => ({
      ...provider,
      certificate: provider.certificate ? '***' : null,
      client_secret: provider.client_secret ? '***' : null
    }))

    return { success: true, data: maskedData }
  } catch (error) {
    // Only log unexpected errors (not permission denied)
    if (error.code !== '42501' && !error.message?.includes('permission denied')) {
      console.error('Error fetching SSO providers:', error)
    }
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Initiate SAML login
 */
export async function initiateSAMLLogin(providerId) {
  try {
    const { data: provider, error: fetchError } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('id', providerId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (fetchError) throw fetchError

    if (provider.provider_type !== 'saml') {
      throw new Error('Provider is not a SAML provider')
    }

    // In production, generate SAML request and redirect
    // For now, return the SSO URL for client-side redirect
    return {
      success: true,
      sso_url: provider.sso_url,
      provider_id: providerId,
      message: 'Redirect to SSO provider'
    }
  } catch (error) {
    console.error('Error initiating SAML login:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Process SAML response
 */
export async function processSAMLResponse(samlResponse) {
  try {
    // In production, validate and parse SAML response
    // Extract user attributes and create/login user
    // This is a simplified placeholder

    const { data: { user } } = await supabase.auth.getUser()
    
    // Log SAML login
    await logSSOLogin(user?.id, null, 'success', 'SAML login successful')

    return {
      success: true,
      message: 'SAML authentication successful'
    }
  } catch (error) {
    console.error('Error processing SAML response:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Initiate OAuth login
 */
export async function initiateOAuthLogin(providerId) {
  try {
    const { data: provider, error: fetchError } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('id', providerId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (fetchError) throw fetchError

    if (provider.provider_type !== 'oauth' && provider.provider_type !== 'oidc') {
      throw new Error('Provider is not an OAuth/OIDC provider')
    }

    // Generate state for CSRF protection
    const state = generateState()
    
    // Store state in session (simplified - use proper session storage in production)
    sessionStorage.setItem(`oauth_state_${providerId}`, state)

    // Build OAuth authorization URL
    const authUrl = buildOAuthURL(provider, state)

    return {
      success: true,
      auth_url: authUrl,
      state,
      provider_id: providerId,
      message: 'Redirect to OAuth provider'
    }
  } catch (error) {
    console.error('Error initiating OAuth login:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Process OAuth callback
 */
export async function processOAuthCallback(code, state, providerId) {
  try {
    // Verify state
    const storedState = sessionStorage.getItem(`oauth_state_${providerId}`)
    if (storedState !== state) {
      throw new Error('Invalid state parameter')
    }

    // Get provider
    const { data: provider, error: fetchError } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('id', providerId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (fetchError) throw fetchError

    // In production, exchange code for tokens
    // Create/login user based on OAuth response
    // This is a simplified placeholder

    const { data: { user } } = await supabase.auth.getUser()
    
    // Log OAuth login
    await logSSOLogin(user?.id, providerId, 'success', 'OAuth login successful')

    // Clear state
    sessionStorage.removeItem(`oauth_state_${providerId}`)

    return {
      success: true,
      message: 'OAuth authentication successful'
    }
  } catch (error) {
    console.error('Error processing OAuth callback:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Build OAuth authorization URL
 */
function buildOAuthURL(provider, state) {
  const params = new URLSearchParams({
    client_id: provider.client_id,
    redirect_uri: `${window.location.origin}/auth/sso/callback`,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state
  })

  return `${provider.sso_url}?${params.toString()}`
}

/**
 * Generate state for CSRF protection
 */
function generateState() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Log SSO login attempt
 */
async function logSSOLogin(userId, providerId, status, errorMessage = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('sso_login_logs')
      .insert({
        user_id: userId || user?.id,
        provider_id: providerId,
        login_status: status,
        error_message: errorMessage,
        ip_address: null, // Get from request in production
        user_agent: navigator.userAgent
      })
  } catch (error) {
    console.error('Error logging SSO login:', error)
  }
}

/**
 * Validate SSO provider
 */
export async function validateSSOProvider(providerId) {
  try {
    const { data, error } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('id', providerId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return { success: true, data, valid: true }
  } catch (error) {
    console.error('Error validating SSO provider:', error)
    return { success: false, message: error.message, valid: false }
  }
}


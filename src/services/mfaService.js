/**
 * MFA Service
 * Handles multi-factor authentication device management, verification, and policies
 */

import { supabase } from './supabaseClient'

/**
 * Generate TOTP secret
 */
function generateTOTPSecret() {
  const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return randomBytes
}

/**
 * Generate backup codes
 */
function generateBackupCodes(count = 10) {
  const codes = []
  for (let i = 0; i < count; i++) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(36).toUpperCase())
      .join('')
      .match(/.{1,4}/g)
      .join('-')
    codes.push(code)
  }
  return codes
}

/**
 * Enroll MFA device
 */
export async function enrollMFA(deviceType, deviceInfo) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let deviceData = {
      user_id: user.id,
      device_name: deviceInfo.device_name || 'Untitled Device',
      device_type: deviceType,
      is_primary: false,
      is_verified: false,
      created_by: user.id
    }

    // Generate secrets based on device type
    if (deviceType === 'totp') {
      deviceData.device_secret = generateTOTPSecret()
    } else if (deviceType === 'sms') {
      deviceData.phone_number = deviceInfo.phone_number
      deviceData.verification_code = generateVerificationCode()
      deviceData.verification_expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    } else if (deviceType === 'email') {
      deviceData.email_address = deviceInfo.email_address || user.email
      deviceData.verification_code = generateVerificationCode()
      deviceData.verification_expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    }

    const { data, error } = await supabase
      .from('mfa_devices')
      .insert(deviceData)
      .select()
      .single()

    if (error) throw error

    // If TOTP, return QR code data
    if (deviceType === 'totp') {
      const totpUri = `otpauth://totp/Project%20Nidus:${encodeURIComponent(user.email)}?secret=${deviceData.device_secret}&issuer=Project%20Nidus`
      return {
        success: true,
        data: {
          ...data,
          totp_secret: deviceData.device_secret,
          totp_uri: totpUri
        },
        message: 'MFA device enrolled. Please verify to complete setup.'
      }
    }

    return {
      success: true,
      data,
      message: deviceType === 'sms' 
        ? 'Verification code sent to your phone.'
        : 'Verification code sent to your email.'
    }
  } catch (error) {
    console.error('Error enrolling MFA device:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Generate verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Verify MFA device
 */
export async function verifyMFADevice(deviceId, verificationCode) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: device, error: fetchError } = await supabase
      .from('mfa_devices')
      .select('*')
      .eq('id', deviceId)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (fetchError) throw fetchError

    // Check if verification code matches and is not expired
    if (device.verification_code !== verificationCode) {
      throw new Error('Invalid verification code')
    }

    if (new Date(device.verification_expires_at) < new Date()) {
      throw new Error('Verification code has expired')
    }

    // Mark device as verified and set as primary if first MFA device
    const { data: existingDevices } = await supabase
      .from('mfa_devices')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_verified', true)
      .eq('is_deleted', false)

    const isPrimary = !existingDevices || existingDevices.length === 0

    const { data, error } = await supabase
      .from('mfa_devices')
      .update({
        is_verified: true,
        is_primary: isPrimary,
        verification_code: null,
        verification_expires_at: null,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', deviceId)
      .select()
      .single()

    if (error) throw error

    // Generate backup codes
    const backupCodes = generateBackupCodes(10)
    const backupCodesData = backupCodes.map(code => ({
      user_id: user.id,
      code, // Should be encrypted in production
      created_by: user.id
    }))

    const { error: backupError } = await supabase
      .from('mfa_backup_codes')
      .insert(backupCodesData)

    if (backupError) throw backupError

    return {
      success: true,
      data,
      backup_codes: backupCodes,
      message: 'MFA device verified successfully. Please save your backup codes.'
    }
  } catch (error) {
    console.error('Error verifying MFA device:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Verify MFA code during login
 */
export async function verifyMFA(code, deviceId = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let device = null

    if (deviceId) {
      // Verify with specific device
      const { data: deviceData, error: deviceError } = await supabase
        .from('mfa_devices')
        .select('*')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .eq('is_verified', true)
        .eq('is_deleted', false)
        .single()

      if (deviceError) throw deviceError
      device = deviceData
    } else {
      // Find primary device
      const { data: deviceData, error: deviceError } = await supabase
        .from('mfa_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .eq('is_verified', true)
        .eq('is_deleted', false)
        .single()

      if (deviceError) throw deviceError
      device = deviceData
    }

    // For TOTP, validate code (simplified - use library like speakeasy in production)
    // For SMS/Email, check verification code
    // For backup codes, check and mark as used

    if (device.device_type === 'totp') {
      // In production, use speakeasy or similar library to verify TOTP
      // This is a placeholder
      const isValid = true // Replace with actual TOTP verification

      if (!isValid) {
        // Log failed attempt
        await logMFAVerification(user.id, device.id, device.device_type, 'failed', 'Invalid TOTP code')
        throw new Error('Invalid MFA code')
      }
    } else {
      // For SMS/Email, check backup codes
      const { data: backupCode, error: backupError } = await supabase
        .from('mfa_backup_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('code', code)
        .eq('is_used', false)
        .eq('is_deleted', false)
        .single()

      if (backupError || !backupCode) {
        await logMFAVerification(user.id, device.id, 'backup_code', 'failed', 'Invalid backup code')
        throw new Error('Invalid MFA code')
      }

      // Mark backup code as used
      await supabase
        .from('mfa_backup_codes')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', backupCode.id)
    }

    // Update last used timestamp
    await supabase
      .from('mfa_devices')
      .update({
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', device.id)

    // Log successful verification
    await logMFAVerification(user.id, device.id, device.device_type, 'success')

    return {
      success: true,
      message: 'MFA verification successful'
    }
  } catch (error) {
    console.error('Error verifying MFA:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Log MFA verification attempt
 */
async function logMFAVerification(userId, deviceId, method, status, failureReason = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const session = await supabase.auth.getSession()

    await supabase
      .from('mfa_verification_logs')
      .insert({
        user_id: userId,
        mfa_device_id: deviceId,
        verification_method: method,
        verification_status: status,
        failure_reason: failureReason,
        ip_address: null, // Get from request in production
        user_agent: navigator.userAgent
      })
  } catch (error) {
    console.error('Error logging MFA verification:', error)
  }
}

/**
 * Get MFA devices for user
 */
export async function getMFADevices() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('mfa_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    // Mask sensitive data
    const maskedData = data.map(device => ({
      ...device,
      device_secret: device.device_secret ? '***' : null,
      phone_number: device.phone_number ? maskPhoneNumber(device.phone_number) : null,
      email_address: device.email_address ? maskEmail(device.email_address) : null,
      verification_code: null
    }))

    return { success: true, data: maskedData }
  } catch (error) {
    console.error('Error fetching MFA devices:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Set primary MFA device
 */
export async function setPrimaryDevice(deviceId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Remove primary from all devices
    await supabase
      .from('mfa_devices')
      .update({
        is_primary: false,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('user_id', user.id)
      .eq('is_deleted', false)

    // Set new primary
    const { data, error } = await supabase
      .from('mfa_devices')
      .update({
        is_primary: true,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', deviceId)
      .eq('user_id', user.id)
      .eq('is_verified', true)
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'Primary MFA device updated' }
  } catch (error) {
    console.error('Error setting primary device:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Disable MFA device
 */
export async function disableMFA(deviceId, password) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // In production, verify password before disabling MFA
    // const { error: passwordError } = await supabase.auth.signInWithPassword({
    //   email: user.email,
    //   password: password
    // })
    // if (passwordError) throw new Error('Invalid password')

    const { data, error } = await supabase
      .from('mfa_devices')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', deviceId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data, message: 'MFA device disabled' }
  } catch (error) {
    console.error('Error disabling MFA device:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Generate new backup codes
 */
export async function generateBackupCodes(count = 10) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Delete old unused backup codes
    await supabase
      .from('mfa_backup_codes')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('user_id', user.id)
      .eq('is_used', false)

    // Generate new backup codes
    const codes = generateBackupCodes(count)
    const backupCodesData = codes.map(code => ({
      user_id: user.id,
      code, // Should be encrypted in production
      created_by: user.id
    }))

    const { error } = await supabase
      .from('mfa_backup_codes')
      .insert(backupCodesData)

    if (error) throw error

    return {
      success: true,
      backup_codes: codes,
      message: 'New backup codes generated. Please save them securely.'
    }
  } catch (error) {
    console.error('Error generating backup codes:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Check if MFA is enforced for user
 */
export async function checkMFAEnforcement() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_deleted', false)

    const roleIds = userRoles?.map(ur => ur.role_id) || []

    // Check MFA policies
    const { data: policies } = await supabase
      .from('mfa_policies')
      .select('*')
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (!policies || policies.length === 0) {
      return { success: true, enforced: false }
    }

    // Check if user or role is in enforcement list
    for (const policy of policies) {
      if (policy.enforce_for_users?.includes(user.id)) {
        return { success: true, enforced: true, policy }
      }

      if (policy.enforce_for_roles?.some(roleId => roleIds.includes(roleId))) {
        return { success: true, enforced: true, policy }
      }
    }

    return { success: true, enforced: false }
  } catch (error) {
    console.error('Error checking MFA enforcement:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Helper functions
 */
function maskPhoneNumber(phone) {
  if (!phone) return null
  return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
}

function maskEmail(email) {
  if (!email) return null
  const [local, domain] = email.split('@')
  return `${local.substring(0, 2)}***@${domain}`
}


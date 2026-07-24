/**
 * Encryption Service
 * Handles field-level data encryption, key management, and key rotation
 * Note: In production, encryption should be done server-side with proper key management
 */

import { supabase } from './supabaseClient'

/**
 * Encrypt field value
 * Note: This is a placeholder - in production, use proper encryption (AES-256-GCM) with keys stored in secure vault
 */
export async function encryptField(value, keyId) {
  try {
    if (!value) return { success: true, encrypted: null }

    // Get encryption key for field
    const { data: key, error: keyError } = await supabase
      .from('encryption_keys')
      .select('*')
      .eq('id', keyId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (keyError) throw keyError

    // In production, use proper encryption (e.g., Web Crypto API or server-side encryption)
    // This is a placeholder that returns base64 encoded value
    const encrypted = btoa(JSON.stringify({ value, key_id: keyId, timestamp: Date.now() }))

    // Log encryption operation
    await logEncryptionOperation('encrypt', null, null, null, true)

    return { success: true, encrypted }
  } catch (error) {
    console.error('Error encrypting field:', error)
    await logEncryptionOperation('encrypt', null, null, null, false, error.message)
    return { success: false, message: error.message }
  }
}

/**
 * Decrypt field value
 * Note: This is a placeholder - in production, use proper decryption
 */
export async function decryptField(encryptedValue, keyId) {
  try {
    if (!encryptedValue) return { success: true, decrypted: null }

    // Get encryption key
    const { data: key, error: keyError } = await supabase
      .from('encryption_keys')
      .select('*')
      .eq('id', keyId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (keyError) throw keyError

    // In production, use proper decryption
    // This is a placeholder that decodes base64
    try {
      const decoded = JSON.parse(atob(encryptedValue))
      const decrypted = decoded.value

      // Log decryption operation
      await logEncryptionOperation('decrypt', null, null, null, true)

      return { success: true, decrypted }
    } catch (decodeError) {
      throw new Error('Invalid encrypted value')
    }
  } catch (error) {
    console.error('Error decrypting field:', error)
    await logEncryptionOperation('decrypt', null, null, null, false, error.message)
    return { success: false, message: error.message }
  }
}

/**
 * Get encryption key for field
 */
export async function getEncryptionKeyForField(tableName, fieldName) {
  try {
    const { data, error } = await supabase
      .from('encrypted_fields')
      .select('*, encryption_keys(*)')
      .eq('table_name', tableName)
      .eq('field_name', fieldName)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching encryption key for field:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Rotate encryption key
 */
export async function rotateEncryptionKey(keyId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get current key
    const { data: currentKey, error: fetchError } = await supabase
      .from('encryption_keys')
      .select('*')
      .eq('id', keyId)
      .eq('is_deleted', false)
      .single()

    if (fetchError) throw fetchError

    // Create new key version
    const newKeyVersion = (currentKey.key_version || 1) + 1
    const newKeyName = `${currentKey.key_name}_v${newKeyVersion}`

    const { data: newKey, error: createError } = await supabase
      .from('encryption_keys')
      .insert({
        key_name: newKeyName,
        key_type: currentKey.key_type,
        key_version: newKeyVersion,
        key_algorithm: currentKey.key_algorithm,
        is_active: true,
        last_rotated_at: new Date().toISOString(),
        created_by: user.id
      })
      .select()
      .single()

    if (createError) throw createError

    // Update old key
    await supabase
      .from('encryption_keys')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', keyId)

    // Update encrypted fields to use new key (simplified - in production, re-encrypt all data)
    await supabase
      .from('encrypted_fields')
      .update({
        encryption_key_id: newKey.id,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('encryption_key_id', keyId)
      .eq('is_deleted', false)

    // Log key rotation
    await logEncryptionOperation('key_rotation', null, null, null, true)

    return {
      success: true,
      data: newKey,
      message: 'Encryption key rotated successfully'
    }
  } catch (error) {
    console.error('Error rotating encryption key:', error)
    await logEncryptionOperation('key_rotation', null, null, null, false, error.message)
    return { success: false, message: error.message }
  }
}

/**
 * Get encryption keys
 */
export async function getEncryptionKeys(filters = {}) {
  try {
    let query = supabase
      .from('encryption_keys')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (filters.key_type) {
      query = query.eq('key_type', filters.key_type)
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    const { data, error } = await query

    if (error) throw error

    // Mask key values
    const maskedData = data.map(key => ({
      ...key,
      key_value: key.key_value ? '***' : null
    }))

    return { success: true, data: maskedData }
  } catch (error) {
    console.error('Error fetching encryption keys:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get encrypted fields
 */
export async function getEncryptedFields(filters = {}) {
  try {
    let query = supabase
      .from('encrypted_fields')
      .select('*, encryption_keys(key_name, key_algorithm, key_version)')
      .eq('is_deleted', false)
      .order('table_name', { ascending: true })
      .order('field_name', { ascending: true })

    if (filters.table_name) {
      query = query.eq('table_name', filters.table_name)
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching encrypted fields:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Log encryption operation
 */
async function logEncryptionOperation(operation, tableName, fieldName, recordId, success, errorMessage = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('encryption_audit_logs')
      .insert({
        user_id: user?.id,
        operation,
        table_name: tableName,
        field_name: fieldName,
        record_id: recordId,
        success,
        error_message: errorMessage,
        created_by: user?.id
      })
  } catch (error) {
    console.error('Error logging encryption operation:', error)
  }
}


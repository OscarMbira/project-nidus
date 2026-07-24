// File upload service for Supabase Storage

import { supabase } from './supabaseClient'

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - The storage bucket name (e.g., 'task-attachments')
 * @param {string} path - The path within the bucket (e.g., 'tasks/{taskId}/{filename}')
 * @returns {Promise<{path: string, url: string}>} - The file path and public URL
 */
export async function uploadFile(file, bucket, path) {
  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      // Handle specific errors
      if (error.message.includes('Bucket not found')) {
        throw new Error('Storage bucket not found. Please create the "task-attachments" bucket in Supabase Storage.')
      }
      if (error.message.includes('new row violates row-level security')) {
        throw new Error('Permission denied. Please check storage policies.')
      }
      throw error
    }

    // Get public URL (works for both public and private buckets)
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      path: data.path,
      url: urlData.publicUrl
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

/**
 * Delete a file from Supabase Storage
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The file path to delete
 */
export async function deleteFile(bucket, path) {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

/**
 * Get file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Human-readable file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} - File extension
 */
export function getFileExtension(filename) {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension
 * @returns {string} - MIME type
 */
export function getMimeType(extension) {
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed'
  }
  return mimeTypes[extension] || 'application/octet-stream'
}


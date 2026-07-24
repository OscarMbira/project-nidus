/**
 * Document Storage Service
 *
 * Handles file upload, download, versioning, and storage management
 * for the PMO Document Governance module.
 *
 * Features:
 * - Upload files to Supabase Storage (project-documents bucket)
 * - Download files via signed URLs (private bucket)
 * - Version control (auto-increment version numbers)
 * - File validation (size, type, extension)
 * - Storage usage calculation
 * - SHA256 hash generation for duplicate detection
 *
 * @module documentStorageService
 */

import { platformDb } from './supabaseClient'

// Simple UUID v4 generator (browser-compatible)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Constants
const PROJECT_DOCUMENTS_BUCKET = 'project-documents'
const PROGRAMME_DOCUMENTS_BUCKET = 'programme-documents'
const MAX_FILE_SIZE = 52428800 // 50MB in bytes
const SIGNED_URL_EXPIRY = 3600 // 1 hour in seconds

// Allowed file extensions (matches v150_supabase_storage_setup.sql)
const ALLOWED_EXTENSIONS = [
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'md', 'txt',
  'png', 'jpg', 'jpeg', 'tiff', 'tif', 'gif', 'svg',
  'zip', 'rar', 'pptx', 'csv', 'json'
]

// MIME type mapping (matches get_mime_type_from_extension function)
const MIME_TYPES = {
  'pdf': 'application/pdf',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'doc': 'application/msword',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'xls': 'application/vnd.ms-excel',
  'md': 'text/markdown',
  'txt': 'text/plain',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'csv': 'text/csv',
  'json': 'application/json'
}

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} - File extension (lowercase, without dot)
 */
export function getFileExtension(filename) {
  if (!filename) return ''
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension (without dot)
 * @returns {string} - MIME type
 */
export function getMimeType(extension) {
  return MIME_TYPES[extension?.toLowerCase()] || 'application/octet-stream'
}

/**
 * Validate file extension
 * @param {string} extension - File extension to validate
 * @returns {boolean} - True if extension is allowed
 */
export function isAllowedExtension(extension) {
  return ALLOWED_EXTENSIONS.includes(extension?.toLowerCase())
}

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @returns {boolean} - True if size is within limit
 */
export function isValidFileSize(size) {
  return size > 0 && size <= MAX_FILE_SIZE
}

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

/**
 * Generate SHA256 hash for file content (for duplicate detection)
 * @param {File} file - The file to hash
 * @returns {Promise<string>} - SHA256 hash as hex string
 */
export async function generateFileHash(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  } catch (error) {
    console.error('Error generating file hash:', error)
    throw new Error('Failed to generate file hash')
  }
}

/**
 * Validate file before upload
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result with { valid, error, extension, mimeType }
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  const extension = getFileExtension(file.name)

  if (!extension) {
    return { valid: false, error: 'File has no extension' }
  }

  if (!isAllowedExtension(extension)) {
    return {
      valid: false,
      error: `File type .${extension} is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    }
  }

  if (!isValidFileSize(file.size)) {
    return {
      valid: false,
      error: `File size must be between 1 byte and ${formatFileSize(MAX_FILE_SIZE)}. Current size: ${formatFileSize(file.size)}`
    }
  }

  const mimeType = getMimeType(extension)

  return { valid: true, extension, mimeType }
}

/**
 * Generate storage path for project document
 * Format: {project_id}/{document_type_id}/{version}/{uuid}_{filename}
 * @param {string} projectId - Project UUID
 * @param {string} documentTypeId - Document type UUID
 * @param {number} version - Version number
 * @param {string} filename - Original filename
 * @returns {string} - Storage path
 */
export function generateStoragePath(projectId, documentTypeId, version, filename) {
  const uuid = generateUUID().substring(0, 8) // Use first 8 chars of UUID
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_') // Sanitize filename
  return `${projectId}/${documentTypeId}/${version}/${uuid}_${sanitizedFilename}`
}

/**
 * Upload file to Supabase Storage (project-documents bucket)
 * @param {File} file - The file to upload
 * @param {string} projectId - Project UUID
 * @param {string} documentTypeId - Document type UUID
 * @param {number} version - Version number (default: 1)
 * @returns {Promise<Object>} - Upload result with { path, filename, size, extension, mimeType, hash }
 */
export async function uploadProjectDocument(file, projectId, documentTypeId, version = 1) {
  try {
    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Generate file hash
    const fileHash = await generateFileHash(file)

    // Generate storage path
    const storagePath = generateStoragePath(projectId, documentTypeId, version, file.name)

    // Upload file to Supabase Storage
    const { data, error } = await platformDb.storage
      .from(PROJECT_DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: validation.mimeType
      })

    if (error) {
      if (error.message.includes('Bucket not found')) {
        throw new Error(`Storage bucket "${PROJECT_DOCUMENTS_BUCKET}" not found. Please create it in Supabase Storage.`)
      }
      if (error.message.includes('row-level security')) {
        throw new Error('Permission denied. Please check storage RLS policies.')
      }
      if (error.message.includes('The resource already exists')) {
        throw new Error('File already exists at this location. Version conflict.')
      }
      throw error
    }

    return {
      path: data.path,
      filename: file.name,
      size: file.size,
      extension: validation.extension,
      mimeType: validation.mimeType,
      hash: fileHash
    }
  } catch (error) {
    console.error('Error uploading project document:', error)
    throw error
  }
}

/**
 * Upload file to programme-documents bucket
 * @param {File} file - The file to upload
 * @param {string} programmeId - Programme UUID
 * @param {string} documentTypeId - Document type UUID
 * @param {number} version - Version number
 * @returns {Promise<Object>} - Upload result
 */
export async function uploadProgrammeDocument(file, programmeId, documentTypeId, version = 1) {
  try {
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const fileHash = await generateFileHash(file)
    const storagePath = generateStoragePath(programmeId, documentTypeId, version, file.name)

    const { data, error } = await platformDb.storage
      .from(PROGRAMME_DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: validation.mimeType
      })

    if (error) {
      if (error.message.includes('Bucket not found')) {
        throw new Error(`Storage bucket "${PROGRAMME_DOCUMENTS_BUCKET}" not found.`)
      }
      if (error.message.includes('row-level security')) {
        throw new Error('Permission denied. Please check storage RLS policies.')
      }
      throw error
    }

    return {
      path: data.path,
      filename: file.name,
      size: file.size,
      extension: validation.extension,
      mimeType: validation.mimeType,
      hash: fileHash
    }
  } catch (error) {
    console.error('Error uploading programme document:', error)
    throw error
  }
}

/**
 * Generate signed URL for downloading private files
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @param {number} expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
export async function getSignedUrl(bucket, path, expiresIn = SIGNED_URL_EXPIRY) {
  try {
    const { data, error } = await platformDb.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) throw error

    return data.signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw error
  }
}

/**
 * Download project document (get signed URL)
 * @param {string} filePath - File path in storage
 * @returns {Promise<string>} - Signed download URL
 */
export async function downloadProjectDocument(filePath) {
  return getSignedUrl(PROJECT_DOCUMENTS_BUCKET, filePath)
}

/**
 * Download programme document (get signed URL)
 * @param {string} filePath - File path in storage
 * @returns {Promise<string>} - Signed download URL
 */
export async function downloadProgrammeDocument(filePath) {
  return getSignedUrl(PROGRAMME_DOCUMENTS_BUCKET, filePath)
}

/**
 * Delete file from storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path to delete
 * @returns {Promise<void>}
 */
export async function deleteFile(bucket, path) {
  try {
    const { error } = await platformDb.storage
      .from(bucket)
      .remove([path])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

/**
 * Delete project document from storage
 * @param {string} filePath - File path to delete
 * @returns {Promise<void>}
 */
export async function deleteProjectDocument(filePath) {
  return deleteFile(PROJECT_DOCUMENTS_BUCKET, filePath)
}

/**
 * Delete programme document from storage
 * @param {string} filePath - File path to delete
 * @returns {Promise<void>}
 */
export async function deleteProgrammeDocument(filePath) {
  return deleteFile(PROGRAMME_DOCUMENTS_BUCKET, filePath)
}

/**
 * Calculate project storage usage (calls database function)
 * @param {string} projectId - Project UUID
 * @returns {Promise<number>} - Storage usage in bytes
 */
export async function getProjectStorageUsage(projectId) {
  try {
    const { data, error } = await platformDb
      .rpc('calculate_project_storage_usage', { p_project_id: projectId })

    if (error) throw error

    return data || 0
  } catch (error) {
    console.error('Error calculating project storage usage:', error)
    throw error
  }
}

/**
 * Calculate programme storage usage (calls database function)
 * @param {string} programmeId - Programme UUID
 * @returns {Promise<number>} - Storage usage in bytes
 */
export async function getProgrammeStorageUsage(programmeId) {
  try {
    const { data, error } = await platformDb
      .rpc('calculate_programme_storage_usage', { p_programme_id: programmeId })

    if (error) throw error

    return data || 0
  } catch (error) {
    console.error('Error calculating programme storage usage:', error)
    throw error
  }
}

/**
 * Check if project storage is over limit
 * @param {string} projectId - Project UUID
 * @param {number} limit - Storage limit in bytes (default: 500MB)
 * @returns {Promise<Object>} - { used, limit, percentage, isOverLimit }
 */
export async function checkProjectStorageLimit(projectId, limit = 524288000) {
  try {
    const used = await getProjectStorageUsage(projectId)
    const percentage = (used / limit) * 100

    return {
      used,
      limit,
      percentage: Math.round(percentage * 100) / 100,
      isOverLimit: used > limit,
      isWarning: used > (limit * 0.8) // 80% threshold
    }
  } catch (error) {
    console.error('Error checking project storage limit:', error)
    throw error
  }
}

/**
 * List files in a storage path
 * @param {string} bucket - Bucket name
 * @param {string} path - Path to list (e.g., projectId/documentTypeId)
 * @returns {Promise<Array>} - Array of file objects
 */
export async function listFiles(bucket, path) {
  try {
    const { data, error } = await platformDb.storage
      .from(bucket)
      .list(path)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error listing files:', error)
    throw error
  }
}

/**
 * Get file metadata from storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @returns {Promise<Object>} - File metadata
 */
export async function getFileMetadata(bucket, path) {
  try {
    const { data, error } = await platformDb.storage
      .from(bucket)
      .list(path.substring(0, path.lastIndexOf('/')), {
        search: path.substring(path.lastIndexOf('/') + 1)
      })

    if (error) throw error

    return data && data.length > 0 ? data[0] : null
  } catch (error) {
    console.error('Error getting file metadata:', error)
    throw error
  }
}

export default {
  // File validation
  validateFile,
  isAllowedExtension,
  isValidFileSize,
  getFileExtension,
  getMimeType,
  formatFileSize,
  generateFileHash,

  // Upload
  uploadProjectDocument,
  uploadProgrammeDocument,

  // Download
  downloadProjectDocument,
  downloadProgrammeDocument,
  getSignedUrl,

  // Delete
  deleteProjectDocument,
  deleteProgrammeDocument,
  deleteFile,

  // Storage management
  getProjectStorageUsage,
  getProgrammeStorageUsage,
  checkProjectStorageLimit,
  listFiles,
  getFileMetadata,

  // Constants
  PROJECT_DOCUMENTS_BUCKET,
  PROGRAMME_DOCUMENTS_BUCKET,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  MIME_TYPES
}

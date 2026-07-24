import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import { Paperclip, Download, Trash2, File, Image, FileText, X } from 'lucide-react'
import { uploadFile, deleteFile, formatFileSize, getFileExtension, getMimeType } from '../services/fileUploadService'

const STORAGE_BUCKET = 'task-attachments'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function TaskAttachments({ taskId }) {
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchAttachments()
  }, [taskId])

  const fetchAttachments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('task_attachments')
        .select(`
          *,
          user:user_id (id, full_name, email),
          created_by_user:created_by (id, full_name, email)
        `)
        .eq('task_id', taskId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAttachments(data || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Validate file sizes
    const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE)
    if (oversizedFiles.length > 0) {
      alert(`Some files exceed the maximum size of ${formatFileSize(MAX_FILE_SIZE)}. Please select smaller files.`)
      return
    }

    // Upload files
    for (const file of files) {
      await uploadAttachment(file)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadAttachment = async (file) => {
    try {
      setUploading(true)
      setUploadProgress(0)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = getFileExtension(file.name)
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${timestamp}_${sanitizedFileName}`
      const filePath = `tasks/${taskId}/${fileName}`

      // Upload to Supabase Storage
      const { path, url } = await uploadFile(file, STORAGE_BUCKET, filePath)

      // Create attachment record
      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_path: path,
          file_url: url,
          file_size: file.size,
          file_type: getMimeType(fileExtension),
          file_extension: fileExtension,
          user_id: user.id,
          created_by: user.id
        })
        .select(`
          *,
          user:user_id (id, full_name, email),
          created_by_user:created_by (id, full_name, email)
        `)
        .single()

      if (error) throw error

      setAttachments(prev => [data, ...prev])
      setUploadProgress(0)
    } catch (error) {
      console.error('Error uploading attachment:', error)
      alert('Error uploading file: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (attachmentId, filePath) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Delete from storage
      await deleteFile(STORAGE_BUCKET, filePath)

      // Soft delete from database
      const { error } = await supabase
        .from('task_attachments')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', attachmentId)

      if (error) throw error

      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert('Error deleting attachment: ' + error.message)
    }
  }

  const handleDownload = (attachment) => {
    if (attachment.file_url) {
      window.open(attachment.file_url, '_blank')
    } else {
      alert('File URL not available')
    }
  }

  const getFileIcon = (fileType, extension) => {
    if (fileType?.startsWith('image/')) {
      return <Image className="h-5 w-5" />
    }
    if (extension === 'pdf' || fileType === 'application/pdf') {
      return <FileText className="h-5 w-5" />
    }
    return <File className="h-5 w-5" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Attachments ({attachments.length})
        </h3>
        <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Upload File
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {uploading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Uploading... {uploadProgress > 0 && `${uploadProgress}%`}
            </span>
          </div>
        </div>
      )}

      {/* Attachments List */}
      <div className="space-y-2">
        {attachments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No attachments yet. Click "Upload File" to add files.
          </p>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                  {getFileIcon(attachment.file_type, attachment.file_extension)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {attachment.file_name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    {attachment.user && (
                      <span>
                        by {attachment.user.full_name || attachment.user.email}
                      </span>
                    )}
                    <span>
                      {new Date(attachment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {attachment.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {attachment.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(attachment.id, attachment.file_path)}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
      </p>
    </div>
  )
}


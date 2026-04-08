/**
 * Entry Attachments Component
 * File attachments for daily log entries
 */

import { useState, useEffect, useRef } from 'react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { Paperclip, Download, Trash2, File, Image, FileText, X, Upload } from 'lucide-react';

const STORAGE_BUCKET = 'daily-log-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper functions (inline to avoid dependency issues)
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const getFileExtension = (filename) => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

const getMimeType = (extension) => {
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
  };
  return mimeTypes[extension] || 'application/octet-stream';
};

export default function EntryAttachments({ entryId }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (entryId) {
      fetchAttachments();
    }
  }, [entryId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const { data, error } = await platformDb
        .from('daily_log_attachments')
        .select(`
          *,
          uploaded_by_user:uploaded_by(id, full_name, email)
        `)
        .eq('entry_id', entryId)
        .eq('is_deleted', false)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate file sizes
    const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Some files exceed the maximum size of ${formatFileSize(MAX_FILE_SIZE)}. Please select smaller files.`);
      return;
    }

    // Upload files
    for (const file of files) {
      await uploadAttachment(file);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAttachment = async (file) => {
    try {
      setUploading(true);

      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single();

      if (!userRecord) throw new Error('User record not found');

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = getFileExtension(file.name);
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedFileName}`;
      const filePath = `entries/${entryId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await platformDb.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage bucket not found. Please create the "daily-log-attachments" bucket in Supabase Storage.');
        }
        throw uploadError;
      }

      const path = uploadData.path;
      const { data: urlData } = platformDb.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
      const url = urlData.publicUrl;

      // Create attachment record
      const { data, error } = await platformDb
        .from('daily_log_attachments')
        .insert({
          entry_id: entryId,
          file_name: file.name,
          file_path: path,
          file_type: getMimeType(fileExtension),
          file_size: file.size,
          uploaded_by: userRecord.id
        })
        .select(`
          *,
          uploaded_by_user:uploaded_by(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      setAttachments(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error uploading attachment:', error);
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId, filePath) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      // Delete from storage
      const { error: deleteError } = await platformDb.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Delete from database
      const { error } = await platformDb
        .from('daily_log_attachments')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', attachmentId);

      if (error) throw error;

      setAttachments(attachments.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Error deleting file: ' + error.message);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      // Get signed URL for download
      const { data, error } = await platformDb.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(attachment.file_path, 3600);

      if (error) throw error;

      // Open download link
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file: ' + error.message);
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <File className="w-5 h-5" />;
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-4">Loading attachments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Paperclip className="w-5 h-5" />
          Attachments ({attachments.length})
        </h3>
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
          <Upload className="w-4 h-4" />
          Upload
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
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
          Uploading file...
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="text-gray-500 text-sm">No attachments yet. Click "Upload" to add files.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-gray-600">
                  {getFileIcon(attachment.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{attachment.file_name}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(attachment.id, attachment.file_path)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

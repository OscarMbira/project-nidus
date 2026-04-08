/**
 * Lesson Attachments Component
 * File attachments for lessons
 */

import { useState, useEffect, useRef } from 'react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { Paperclip, Download, Trash2, File, Upload } from 'lucide-react';

const STORAGE_BUCKET = 'lesson-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default function LessonAttachments({ lessonId }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const getCurrentUserId = async () => {
      const { data: { user } } = await platformDb.auth.getUser();
      if (user) {
        const { data: userRecord } = await platformDb
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('is_deleted', false)
          .single();
        setCurrentUserId(userRecord?.id);
      }
    };
    getCurrentUserId();
  }, []);

  useEffect(() => {
    if (lessonId) {
      fetchAttachments();
    }
  }, [lessonId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const { data, error } = await platformDb
        .from('lesson_attachments')
        .select('*')
        .eq('lesson_id', lessonId)
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

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} exceeds maximum size of ${formatFileSize(MAX_FILE_SIZE)}`);
        continue;
      }

      await uploadFile(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file) => {
    try {
      setUploading(true);
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user || !currentUserId) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${lessonId}/${Date.now()}_${file.name}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { error: uploadError } = await platformDb.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = platformDb.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Create attachment record
      const { error: insertError } = await platformDb
        .from('lesson_attachments')
        .insert({
          lesson_id: lessonId,
          file_name: file.name,
          file_path: filePath,
          file_type: fileExt,
          file_size: file.size,
          uploaded_by: currentUserId
        });

      if (insertError) throw insertError;

      fetchAttachments();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId, filePath) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      // Delete from storage
      await platformDb.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      // Delete record
      const { error } = await platformDb
        .from('lesson_attachments')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', attachmentId);

      if (error) throw error;
      fetchAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Error deleting attachment: ' + error.message);
    }
  };

  const handleDownload = async (filePath, fileName) => {
    try {
      const { data, error } = await platformDb.storage
        .from(STORAGE_BUCKET)
        .download(filePath);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Paperclip className="w-5 h-5" />
          Attachments ({attachments.length})
        </h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-3 flex-1">
                <File className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(attachment.file_path, attachment.file_name)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                {attachment.uploaded_by === currentUserId && (
                  <button
                    onClick={() => handleDelete(attachment.id, attachment.file_path)}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

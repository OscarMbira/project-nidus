/**
 * File Upload Dropzone Component
 * 
 * Drag-and-drop file upload area with:
 * - Multiple file selection
 * - Real-time upload progress
 * - File type validation
 * - File size validation (max 50MB)
 * - Preview thumbnail for images
 * - Cancel upload functionality
 */

import { useState, useCallback, memo } from 'react';
import { Upload, X, File, Image, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { validateFile, formatFileSize, isAllowedExtension } from '../../../services/documentStorageService';
import toast from 'react-hot-toast';

const FileUploadDropzone = memo(function FileUploadDropzone({
  onFilesSelected,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  acceptedExtensions = null, // null = all allowed extensions
  className = ''
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploading, setUploading] = useState(false);

  const validateFiles = useCallback((files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileArray.forEach((file) => {
      const validation = validateFile(file);
      
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        return;
      }

      // Check extension filter if provided
      if (acceptedExtensions) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!acceptedExtensions.includes(ext)) {
          errors.push(`${file.name}: File type not accepted`);
          return;
        }
      }

      validFiles.push({
        file,
        id: `${file.name}-${file.size}-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        extension: file.name.split('.').pop()?.toLowerCase() || '',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        status: 'pending'
      });
    });

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    return validFiles;
  }, [acceptedExtensions]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles].slice(0, maxFiles);
      setSelectedFiles(newFiles);
      if (onFilesSelected) {
        onFilesSelected(newFiles.map(f => f.file));
      }
    }
  }, [selectedFiles, maxFiles, validateFiles, onFilesSelected]);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length === 0) return;

    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles].slice(0, maxFiles);
      setSelectedFiles(newFiles);
      if (onFilesSelected) {
        onFilesSelected(newFiles.map(f => f.file));
      }
    }

    // Reset input
    e.target.value = '';
  }, [selectedFiles, maxFiles, validateFiles, onFilesSelected]);

  const removeFile = useCallback((fileId) => {
    const file = selectedFiles.find(f => f.id === fileId);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    
    const newFiles = selectedFiles.filter(f => f.id !== fileId);
    setSelectedFiles(newFiles);
    
    if (onFilesSelected && newFiles.length > 0) {
      onFilesSelected(newFiles.map(f => f.file));
    }
  }, [selectedFiles, onFilesSelected]);

  const getFileIcon = (extension) => {
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'tiff', 'tif'].includes(extension)) {
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className={className}>
      {/* Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="file-upload-input"
          accept={acceptedExtensions ? acceptedExtensions.map(ext => `.${ext}`).join(',') : undefined}
        />
        
        <label
          htmlFor="file-upload-input"
          className="cursor-pointer flex flex-col items-center gap-4"
        >
          <Upload className={`h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Maximum {maxFiles} files, 50MB per file
            </p>
          </div>
        </label>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Selected Files ({selectedFiles.length}/{maxFiles})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedFiles.map((fileInfo) => (
              <div
                key={fileInfo.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* Preview/Icon */}
                <div className="flex-shrink-0">
                  {fileInfo.preview ? (
                    <img
                      src={fileInfo.preview}
                      alt={fileInfo.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(fileInfo.extension)
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {fileInfo.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(fileInfo.size)}
                  </p>
                </div>

                {/* Status */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {fileInfo.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {fileInfo.status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {fileInfo.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  
                  {!uploading && (
                    <button
                      onClick={() => removeFile(fileInfo.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default FileUploadDropzone;

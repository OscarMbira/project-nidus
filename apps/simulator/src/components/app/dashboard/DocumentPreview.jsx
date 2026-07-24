/**
 * Document Preview Component
 * 
 * Preview documents in-app for supported formats:
 * - PDF files (using iframe)
 * - Images (PNG, JPEG, TIFF) with zoom/pan
 * - Markdown files (rendered HTML)
 * - Show download button for non-previewable formats
 */

import { useState, useEffect, memo } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, FileText, Image as ImageIcon } from 'lucide-react';
import { downloadProjectDocument } from '../../../services/documentStorageService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

// Markdown Preview Component
const MarkdownPreview = ({ url }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (url) {
      fetch(url)
        .then(r => r.text())
        .then(text => {
          setContent(text);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading markdown:', err);
          setLoading(false);
        });
    }
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 bg-white dark:bg-gray-800">
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

const DocumentPreview = memo(function DocumentPreview({
  document,
  onClose
}) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (document?.file_path) {
      loadPreview();
    }
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [document?.file_path]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = await downloadProjectDocument(document.file_path);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Error loading preview:', err);
      setError(err.message || 'Failed to load preview');
      toast.error('Failed to load document preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document.file_path) {
      toast.error('No file available for download');
      return;
    }

    try {
      const url = await downloadProjectDocument(document.file_path);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.file_name || 'document';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);
      toast.success('Download started');
    } catch (err) {
      console.error('Error downloading document:', err);
      toast.error('Failed to download document');
    }
  };

  const isImage = () => {
    const ext = document.file_extension?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'tiff', 'tif'].includes(ext);
  };

  const isPDF = () => {
    return document.file_type === 'application/pdf' || document.file_extension?.toLowerCase() === 'pdf';
  };

  const isMarkdown = () => {
    return document.file_type === 'text/markdown' || document.file_extension?.toLowerCase() === 'md';
  };

  const isPreviewable = () => {
    return isImage() || isPDF() || isMarkdown();
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={loadPreview}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No preview available</p>
          </div>
        </div>
      );
    }

    if (isPDF()) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title="PDF Preview"
        />
      );
    }

    if (isImage()) {
      return (
        <div className="flex items-center justify-center h-full overflow-auto bg-gray-100 dark:bg-gray-900">
          <img
            src={previewUrl}
            alt={document.title || document.file_name}
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s'
            }}
          />
        </div>
      );
    }

    if (isMarkdown()) {
      // Markdown preview will be handled separately with async loading
      return (
        <MarkdownPreview url={previewUrl} />
      );
    }

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Preview not available for this file type
          </p>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download File
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {isImage() && <ImageIcon className="h-5 w-5 text-gray-500" />}
            {isPDF() && <FileText className="h-5 w-5 text-gray-500" />}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {document?.title || document?.file_name}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Image Controls */}
            {isImage() && (
              <>
                <button
                  onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4 text-gray-500" />
                </button>
              </>
            )}
            
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4 text-gray-500" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
});

export default DocumentPreview;

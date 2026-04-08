/**
 * Document Register Component
 * 
 * PMO view of all project documents with:
 * - Documents grouped by stage
 * - Mandatory vs optional indicators
 * - Status badges
 * - File upload/download
 * - Version history
 * - Filtering and search
 */

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  FileText, Upload, Download, History, Search, Filter, 
  CheckCircle2, XCircle, Clock, AlertCircle, File, Image,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { 
  getProjectDocuments, 
  getDocumentTypes,
  getDocumentStages,
  DOCUMENT_STATUS 
} from '../../../services/documentGovernanceService';
import { downloadProjectDocument, formatFileSize } from '../../../services/documentStorageService';
import FileUploadDropzone from './FileUploadDropzone';
import DocumentVersionHistory from './DocumentVersionHistory';
import DocumentPreview from './DocumentPreview';
import toast from 'react-hot-toast';

const DocumentRegister = memo(function DocumentRegister({ 
  projectId, 
  organizationId,
  onDocumentUpdate 
}) {
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [selectedStage, setSelectedStage] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [mandatoryOnly, setMandatoryOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI State
  const [expandedStages, setExpandedStages] = useState(new Set());
  const [uploadingDocument, setUploadingDocument] = useState(null);
  const [viewingVersions, setViewingVersions] = useState(null);
  const [previewingDocument, setPreviewingDocument] = useState(null);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [docsData, typesData, stagesData] = await Promise.all([
        getProjectDocuments(projectId),
        getDocumentTypes(),
        getDocumentStages()
      ]);
      
      setDocuments(docsData);
      setDocumentTypes(typesData);
      setStages(stagesData);
      
      // Auto-expand first stage
      if (stagesData.length > 0) {
        setExpandedStages(new Set([stagesData[0].stage_code]));
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Failed to load documents');
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Group documents by stage
  const documentsByStage = useMemo(() => {
    const grouped = {};
    
    stages.forEach(stage => {
      grouped[stage.stage_code] = {
        stage,
        documents: [],
        required: [],
        optional: []
      };
    });
    
    documents.forEach(doc => {
      const stageCode = doc.document_types?.stage_code;
      if (stageCode && grouped[stageCode]) {
        grouped[stageCode].documents.push(doc);
        
        if (doc.document_types?.is_mandatory) {
          grouped[stageCode].required.push(doc);
        } else {
          grouped[stageCode].optional.push(doc);
        }
      }
    });
    
    return grouped;
  }, [documents, stages]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    
    if (selectedStage) {
      filtered = filtered.filter(doc => doc.document_types?.stage_code === selectedStage);
    }
    
    if (selectedStatus) {
      filtered = filtered.filter(doc => doc.status === selectedStatus);
    }
    
    if (mandatoryOnly) {
      filtered = filtered.filter(doc => doc.document_types?.is_mandatory === true);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title?.toLowerCase().includes(query) ||
        doc.document_types?.name?.toLowerCase().includes(query) ||
        doc.owner?.full_name?.toLowerCase().includes(query) ||
        doc.approver?.full_name?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [documents, selectedStage, selectedStatus, mandatoryOnly, searchQuery]);

  const toggleStage = useCallback((stageCode) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageCode)) {
        next.delete(stageCode);
      } else {
        next.add(stageCode);
      }
      return next;
    });
  }, []);

  const handleDownload = async (document) => {
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

  const getStatusBadge = (status) => {
    const badges = {
      [DOCUMENT_STATUS.NOT_STARTED]: { 
        icon: Clock, 
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        label: 'Not Started'
      },
      [DOCUMENT_STATUS.DRAFT]: { 
        icon: FileText, 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        label: 'Draft'
      },
      [DOCUMENT_STATUS.SUBMITTED]: { 
        icon: Clock, 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        label: 'Submitted'
      },
      [DOCUMENT_STATUS.APPROVED]: { 
        icon: CheckCircle2, 
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        label: 'Approved'
      },
      [DOCUMENT_STATUS.REJECTED]: { 
        icon: XCircle, 
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        label: 'Rejected'
      }
    };
    
    const badge = badges[status] || badges[DOCUMENT_STATUS.NOT_STARTED];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const getFileIcon = (extension) => {
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'tiff'].includes(extension?.toLowerCase())) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-semibold">Error</h3>
        </div>
        <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          {/* Stage Filter */}
          <div className="min-w-[150px]">
            <select
              value={selectedStage || ''}
              onChange={(e) => setSelectedStage(e.target.value || null)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Stages</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.stage_code}>
                  {stage.stage_name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="min-w-[150px]">
            <select
              value={selectedStatus || ''}
              onChange={(e) => setSelectedStatus(e.target.value || null)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              {Object.values(DOCUMENT_STATUS).map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          
          {/* Mandatory Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mandatoryOnly}
              onChange={(e) => setMandatoryOnly(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Mandatory only</span>
          </label>
        </div>
      </div>

      {/* Documents by Stage */}
      <div className="space-y-4">
        {stages.map(stage => {
          const stageData = documentsByStage[stage.stage_code];
          if (!stageData) return null;
          
          const isExpanded = expandedStages.has(stage.stage_code);
          const stageDocs = stageData.documents.filter(doc => 
            filteredDocuments.some(fd => fd.id === doc.id)
          );
          
          if (stageDocs.length === 0 && !selectedStage) return null;
          
          return (
            <div
              key={stage.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Stage Header */}
              <button
                onClick={() => toggleStage(stage.stage_code)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stage.stage_name}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({stageData.required.length} required, {stageData.optional.length} optional)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {stageData.required.some(doc => 
                    !doc.file_path || doc.status !== DOCUMENT_STATUS.APPROVED
                  ) && (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
              </button>
              
              {/* Stage Documents */}
              {isExpanded && (
                <div className="px-6 pb-4">
                  {stageDocs.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                      No documents found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stageDocs.map(doc => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {/* File Icon */}
                          <div className="flex-shrink-0">
                            {getFileIcon(doc.file_extension)}
                          </div>
                          
                          {/* Document Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                {doc.title || doc.document_types?.name}
                              </h4>
                              {doc.document_types?.is_mandatory && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-xs font-medium">
                                  Required
                                </span>
                              )}
                              {getStatusBadge(doc.status)}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              {doc.file_size && (
                                <span>{formatFileSize(doc.file_size)}</span>
                              )}
                              {doc.owner && (
                                <span>Owner: {doc.owner.full_name}</span>
                              )}
                              {doc.approver && (
                                <span>Approver: {doc.approver.full_name}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {doc.file_path && (
                              <>
                                <button
                                  onClick={() => setPreviewingDocument(doc)}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                  title="Preview"
                                >
                                  <FileText className="h-4 w-4 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDownload(doc)}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4 text-gray-500" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setViewingVersions(doc)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              title="Version History"
                            >
                              <History className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {viewingVersions && (
        <DocumentVersionHistory
          document={viewingVersions}
          onClose={() => setViewingVersions(null)}
        />
      )}
      
      {previewingDocument && (
        <DocumentPreview
          document={previewingDocument}
          onClose={() => setPreviewingDocument(null)}
        />
      )}
    </div>
  );
});

export default DocumentRegister;

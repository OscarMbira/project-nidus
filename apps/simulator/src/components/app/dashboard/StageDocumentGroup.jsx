/**
 * Stage Document Group Component
 * 
 * Groups documents by stage with:
 * - Stage compliance status (Green/Amber/Red)
 * - Document checklist for each stage
 * - Highlight missing mandatory documents
 * - Show upload count vs required count
 */

import { memo } from 'react';
import { CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import { DOCUMENT_STATUS } from '../../../services/documentGovernanceService';

const StageDocumentGroup = memo(function StageDocumentGroup({
  stage,
  documents = [],
  documentTypes = [],
  onDocumentClick
}) {
  const requiredTypes = documentTypes.filter(dt => dt.is_mandatory);
  const optionalTypes = documentTypes.filter(dt => !dt.is_mandatory);

  const getComplianceStatus = () => {
    const requiredDocs = documents.filter(doc => 
      doc.document_types?.is_mandatory && 
      doc.status === DOCUMENT_STATUS.APPROVED
    );
    const requiredCount = requiredDocs.length;
    const requiredTotal = requiredTypes.length;

    if (requiredCount === requiredTotal && requiredTotal > 0) {
      return { status: 'complete', color: 'green', icon: CheckCircle2 };
    }
    if (requiredCount > 0) {
      return { status: 'partial', color: 'yellow', icon: AlertCircle };
    }
    return { status: 'missing', color: 'red', icon: XCircle };
  };

  const compliance = getComplianceStatus();
  const StatusIcon = compliance.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-5 w-5 text-${compliance.color}-600 dark:text-${compliance.color}-400`} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {stage.stage_name}
          </h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {documents.length} / {documentTypes.length} documents
        </span>
      </div>

      {/* Required Documents */}
      {requiredTypes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Required Documents ({requiredTypes.length})
          </h4>
          <div className="space-y-2">
            {requiredTypes.map(type => {
              const doc = documents.find(d => d.document_type_id === type.id);
              const isComplete = doc && doc.status === DOCUMENT_STATUS.APPROVED;
              
              return (
                <div
                  key={type.id}
                  onClick={() => onDocumentClick && onDocumentClick(doc || type)}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                    ${isComplete
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }
                  `}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${isComplete ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
                    {type.name}
                  </span>
                  {doc && (
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      {doc.status}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Documents */}
      {optionalTypes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Optional Documents ({optionalTypes.length})
          </h4>
          <div className="space-y-2">
            {optionalTypes.map(type => {
              const doc = documents.find(d => d.document_type_id === type.id);
              
              return (
                <div
                  key={type.id}
                  onClick={() => onDocumentClick && onDocumentClick(doc || type)}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                >
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {type.name}
                  </span>
                  {doc && (
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      {doc.status}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default StageDocumentGroup;

/**
 * Quality Activity Bulk Import Component
 * Handles CSV file upload and bulk import of quality activities
 */

import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  parseQualityActivityCSV,
  validateActivityData,
  bulkImportActivities,
  downloadBulkImportTemplate
} from '../../services/qualityActivityBulkImportService';

export default function QualityActivityBulkImport({ onImportComplete }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setValidationResults(null);
      setImportResults(null);
      setErrors([]);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (fileToParse) => {
    try {
      const text = await fileToParse.text();
      const activities = parseQualityActivityCSV(text);

      // Validate all activities
      const validationErrors = [];
      const validationWarnings = [];
      
      activities.forEach((activity, index) => {
        const validation = validateActivityData(activity, index + 2);
        if (!validation.valid) {
          validationErrors.push(...validation.errors.map(err => ({ row: index + 2, error: err })));
        }
        if (validation.warnings.length > 0) {
          validationWarnings.push(...validation.warnings.map(warn => ({ row: index + 2, warning: warn })));
        }
      });

      setValidationResults({
        total: activities.length,
        activities,
        errors: validationErrors,
        warnings: validationWarnings,
        valid: validationErrors.length === 0
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV: ' + error.message);
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!validationResults || !validationResults.valid) {
      alert('Please fix validation errors before importing');
      return;
    }

    try {
      setImporting(true);
      const result = await bulkImportActivities(validationResults.activities);

      setImportResults(result.results);

      if (result.success) {
        alert(`Successfully imported ${result.results.successful} activities`);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        if (result.results.failed > 0) {
          setErrors(result.results.errors);
        }
      }
    } catch (error) {
      console.error('Error importing activities:', error);
      alert('Error importing activities: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadBulkImportTemplate();
  };

  const handleReset = () => {
    setFile(null);
    setValidationResults(null);
    setImportResults(null);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Bulk Import Quality Activities
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload a CSV file to bulk import quality activities. Download the template to see the required format.
        </p>
      </div>

      {/* Download Template */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-900 dark:text-white">CSV Template</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Download the template file with example data and required column headers
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select CSV File
        </label>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="flex-1 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {file ? file.name : 'Click to select CSV file or drag and drop'}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Validation Results */}
      {validationResults && (
        <div className="mb-6">
          <div className={`p-4 rounded-lg border ${
            validationResults.valid
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-start gap-3">
              {validationResults.valid ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white mb-2">
                  Validation Results
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Total rows: {validationResults.total}
                </div>
                {validationResults.errors.length > 0 && (
                  <div className="text-sm text-red-600 dark:text-red-400 mb-2">
                    Errors: {validationResults.errors.length}
                  </div>
                )}
                {validationResults.warnings.length > 0 && (
                  <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                    Warnings: {validationResults.warnings.length}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error List */}
          {errors.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Errors:</div>
              <div className="space-y-1">
                {errors.slice(0, 10).map((error, idx) => (
                  <div key={idx} className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    Row {error.row}: {error.error || error.warning}
                  </div>
                ))}
                {errors.length > 10 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ... and {errors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="mb-6">
          <div className={`p-4 rounded-lg border ${
            importResults.failed === 0
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="font-medium text-gray-900 dark:text-white mb-2">Import Results</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Total</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{importResults.total}</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Successful</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{importResults.successful}</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Failed</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{importResults.failed}</div>
              </div>
            </div>
            {importResults.imported.length > 0 && (
              <div className="mt-4 text-sm">
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Imported Activities:</div>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                  {importResults.imported.slice(0, 5).map((item, idx) => (
                    <li key={idx}>{item.identifier} ({item.type})</li>
                  ))}
                  {importResults.imported.length > 5 && (
                    <li>... and {importResults.imported.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {(file || validationResults || importResults) && (
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Reset
          </button>
        )}
        {validationResults && validationResults.valid && !importResults && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import Activities
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

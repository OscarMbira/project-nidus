/**
 * Daily Log Export Component
 * Export options for daily log
 */

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Printer } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../../services/dailyLogReportService';

export default function DailyLogExport({ projectId, filters = {} }) {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState(null);

  const handleExport = async (type) => {
    try {
      setExporting(true);
      setExportType(type);

      if (type === 'csv') {
        const result = await exportToCSV(projectId, filters);
        if (result.success) {
          // Create download link
          const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `daily-log-${projectId}-${new Date().toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert('Error exporting to CSV: ' + result.error);
        }
      } else if (type === 'pdf') {
        const result = await exportToPDF(projectId, filters);
        if (result.success) {
          // Open print dialog
          const printWindow = window.open('', '_blank');
          printWindow.document.write(result.data);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 500);
        } else {
          alert('Error exporting to PDF: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting: ' + error.message);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Download className="w-4 h-4" />
        Export Options
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleExport('csv')}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {exporting && exportType === 'csv' ? 'Exporting...' : 'Export CSV'}
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          {exporting && exportType === 'pdf' ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        CSV: Download spreadsheet | PDF: Print/Save as PDF
      </p>
    </div>
  );
}

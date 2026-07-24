import { useState } from 'react';
import { FileText, Plus, Download } from 'lucide-react';
import StrategicReportBuilder from '../components/strategy/StrategicReportBuilder';
import ObjectiveForm from '../components/strategy/ObjectiveForm';
import { saveStrategicReport } from '../services/strategicService';

export default function StrategicReports() {
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState(null);

  const handleGenerate = (data) => {
    setSelectedReportData(data);
    setShowReportForm(true);
  };

  const handleEdit = (report) => {
    setSelectedReportData(report);
    setShowReportForm(true);
  };

  const handleReportSaved = () => {
    setShowReportForm(false);
    setSelectedReportData(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
            Strategic Reports
          </h1>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Generate and manage strategic alignment reports
        </p>
      </div>

      <StrategicReportBuilder
        onGenerate={handleGenerate}
        onEdit={handleEdit}
      />

      {/* Report Form Modal - TODO: Create proper report form component */}
    </div>
  );
}


import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import ChangeLog from '../../components/change/ChangeLog';

export default function ChangeLogPage() {
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState('');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              Change Log
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Complete audit trail of all change management activities
            </p>
          </div>
        </div>
      </div>

      <ChangeLog projectId={selectedProjectId || null} />
    </div>
  );
}


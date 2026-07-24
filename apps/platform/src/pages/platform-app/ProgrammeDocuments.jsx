/**
 * Programme Documents Page
 * 
 * Programme-level document compliance rollup
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProgrammeDocumentCompliance from '../../components/app/dashboard/ProgrammeDocumentCompliance';

export default function ProgrammeDocumentsPage() {
  const { programmeId: programmeIdParam } = useParams();
  const [programmeId, setProgrammeId] = useState(programmeIdParam || null);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Programme Documents</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Programme-level document compliance and audit readiness
        </p>
      </div>
      {programmeId ? (
        <ProgrammeDocumentCompliance programmeId={programmeId} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Please select a programme to view its document compliance
          </p>
        </div>
      )}
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import HandoverChecklist from '../../components/structured/closing/HandoverChecklist';

export default function ProjectHandoverFormPage() {
  const { projectId } = usePlatformProjectId();
  const navigate = useNavigate();

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {projectId ? (
        <HandoverChecklist projectId={projectId} onClose={() => navigate(-1)} />
      ) : (
        <p className="text-sm text-gray-700 dark:text-gray-200">Loading handover…</p>
      )}
    </div>
  );
}

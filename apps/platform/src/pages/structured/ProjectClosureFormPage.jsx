import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js';
import { fetchProjectClosure } from '../../services/closingProjectService';
import ProjectClosureForm from '../../components/structured/closing/ProjectClosureForm';

const CLOSURE_SECTIONS = ['basic', 'summary', 'benefits', 'financial-closure', 'resources', 'prepared-by', 'approval', 'final-acceptance'];

export default function ProjectClosureFormPage() {
  const { projectId } = usePlatformProjectId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [closure, setClosure] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestedSection = searchParams.get('section') === 'approval'
    ? 'final-acceptance'
    : (searchParams.get('section') || 'basic');
  const initialSection = CLOSURE_SECTIONS.includes(requestedSection) ? requestedSection : 'basic';

  useEffect(() => {
    if (!projectId) return undefined;
    let cancelled = false;
    setLoading(true);
    fetchProjectClosure(projectId)
      .then((row) => {
        if (!cancelled) setClosure(row);
      })
      .catch((error) => {
        console.error('Error loading project closure:', error);
        if (!cancelled) setClosure(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {loading || !projectId ? (
        <p className="text-sm text-gray-700 dark:text-gray-200">Loading closure…</p>
      ) : (
        <ProjectClosureForm
          projectId={projectId}
          closure={closure}
          initialSection={initialSection}
          onClose={() => navigate(-1)}
        />
      )}
    </div>
  );
}

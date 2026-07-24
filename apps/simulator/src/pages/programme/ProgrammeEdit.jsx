import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Target } from 'lucide-react';
import { getProgramme, saveProgramme } from '../../services/programmeService';
import ProgrammeForm from '../../components/programme/ProgrammeForm';

export default function ProgrammeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPlatformContext = location.pathname.startsWith('/platform');
  const basePath = isPlatformContext ? '/platform/programme' : '/programme';
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.pathname.includes('/edit') && !id) {
      navigate(basePath, { replace: true });
      return;
    }
  }, [location.pathname, id, basePath, navigate]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setError(null);
    setLoading(true);
    getProgramme(id)
      .then((data) => { if (!cancelled) setProgramme(data); })
      .catch((err) => {
        if (!cancelled) {
          console.error('Error fetching programme:', err);
          setError(err?.message || 'Failed to load programme');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    getProgramme(id)
      .then((data) => setProgramme(data))
      .catch((err) => setError(err?.message || 'Failed to load programme'))
      .finally(() => setLoading(false));
  };

  const handleSave = (saved) => {
    navigate(`${basePath}`, { replace: true, state: { toast: { type: 'success', message: `Programme updated. Record ID: ${saved?.id ?? id}` } } });
  };

  const handleCancel = () => {
    navigate(`${basePath}/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" aria-hidden />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading programme...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-2xl mx-auto text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Could not load programme</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate(basePath)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Programmes
            </button>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`${basePath}/${id}`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Programme
            </h1>
          </div>
        </div>
      </div>

      {programme && (
        <ProgrammeForm
          programme={programme}
          onSave={handleSave}
          onCancel={handleCancel}
          embedded={false}
        />
      )}
    </div>
  );
}


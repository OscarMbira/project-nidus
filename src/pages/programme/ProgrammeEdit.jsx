import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target } from 'lucide-react';
import { getProgramme, saveProgramme } from '../../services/programmeService';
import ProgrammeForm from '../../components/programme/ProgrammeForm';

export default function ProgrammeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchProgramme();
    }
  }, [id]);

  const fetchProgramme = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProgramme(id);
      setProgramme(data);
    } catch (err) {
      console.error('Error fetching programme:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    navigate(`/programme/${id}`);
  };

  const handleCancel = () => {
    navigate(`/programme/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading programme...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <span className="font-medium">Error loading programme: {error}</span>
          </div>
          <button
            onClick={() => navigate('/programme')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            Back to Programmes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/programme/${id}`)}
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
        />
      )}
    </div>
  );
}


import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Target, Users, TrendingUp, AlertTriangle, DollarSign, Activity, Calendar, CheckCircle, Link2 } from 'lucide-react';
import { getProgramme, deleteProgramme } from '../../services/programmeService';
import ProgrammeDashboard from '../../components/programme/ProgrammeDashboard';
import ProgrammeForm from '../../components/programme/ProgrammeForm';

export default function ProgrammeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handleDelete = async () => {
    try {
      await deleteProgramme(id);
      navigate('/programme');
    } catch (error) {
      console.error('Error deleting programme:', error);
      alert('Error deleting programme: ' + error.message);
    }
  };

  const handleProgrammeSaved = () => {
    setShowForm(false);
    fetchProgramme();
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
            <AlertTriangle className="h-5 w-5" />
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

  if (!programme) {
    return null;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'projects', label: 'Projects', icon: Target },
    { id: 'dependencies', label: 'Dependencies', icon: Link2 },
    { id: 'benefits', label: 'Benefits', icon: CheckCircle },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/programme')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {programme.programme_name}
                </h1>
                {programme.programme_code && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {programme.programme_code}
                  </p>
                )}
              </div>
            </div>
            {programme.programme_description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-3xl">
                {programme.programme_description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && (
          <ProgrammeDashboard programmeId={id} />
        )}

        {activeTab === 'projects' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-gray-500 dark:text-gray-400">Projects view coming soon...</p>
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-gray-500 dark:text-gray-400">Inter-project dependencies view coming soon...</p>
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-gray-500 dark:text-gray-400">Benefits realization view coming soon...</p>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-gray-500 dark:text-gray-400">Programme timeline view coming soon...</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-gray-500 dark:text-gray-400">Programme reports view coming soon...</p>
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      {showForm && (
        <ProgrammeForm
          programme={programme}
          onSave={handleProgrammeSaved}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}


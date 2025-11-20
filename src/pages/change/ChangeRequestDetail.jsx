import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, FileText, Clock, User, DollarSign, Calendar, Package } from 'lucide-react';
import { fetchChangeRequest } from '../../services/changeManagementService';
import ChangeRequestForm from '../../components/change/ChangeRequestForm';
import ChangeAssessmentForm from '../../components/change/ChangeAssessmentForm';
import ChangeImpactAnalysis from '../../components/change/ChangeImpactAnalysis';
import ChangeLog from '../../components/change/ChangeLog';

export default function ChangeRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await fetchChangeRequest(id);
      setRequest(data);
    } catch (error) {
      console.error('Error loading change request:', error);
      alert('Error loading change request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'under-assessment':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'pending-approval':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'implemented':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'impact', label: 'Impact Analysis', icon: Package },
    { id: 'assessment', label: 'Assessment', icon: Clock },
    { id: 'log', label: 'Change Log', icon: FileText },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Change Request Not Found
          </h3>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {request.change_reference}: {request.change_title}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${getStatusColor(request.change_status)}`}>
                {request.change_status?.replace('-', ' ')}
              </span>
              {request.priority && (
                <span className={`px-3 py-1 text-sm font-medium rounded capitalize ${
                  request.priority === 'critical' || request.priority === 'urgent'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : request.priority === 'high'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {request.priority} priority
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Request Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Change Reference
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">{request.change_reference}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <span className={`px-2 py-1 text-sm font-medium rounded-full capitalize ${getStatusColor(request.change_status)}`}>
                    {request.change_status?.replace('-', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Category
                  </label>
                  <p className="text-gray-900 dark:text-white capitalize">{request.change_category || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Priority
                  </label>
                  <p className="text-gray-900 dark:text-white capitalize">{request.priority || 'N/A'}</p>
                </div>
                {request.submitted_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Submitted Date
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(request.submitted_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {request.requested_by && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Requested By
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {request.requested_by.full_name || request.requested_by.email || 'Unknown'}
                    </p>
                  </div>
                )}
                {request.change_description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Description
                    </label>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {request.change_description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impact' && (
          <ChangeImpactAnalysis
            changeRequest={request}
            onUpdate={(impactData) => {
              // Handle impact data update
              console.log('Impact data updated:', impactData);
            }}
          />
        )}

        {activeTab === 'assessment' && (
          <div>
            {request.change_status === 'submitted' || request.change_status === 'under-assessment' ? (
              <ChangeAssessmentForm
                changeRequest={request}
                onSave={() => {
                  loadRequest();
                  setShowAssessmentForm(false);
                }}
                onCancel={() => setShowAssessmentForm(false)}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                {request.assessment && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assessment Details</h3>
                    {request.assessment.assessment_summary && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Assessment Summary
                        </label>
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                          {request.assessment.assessment_summary}
                        </p>
                      </div>
                    )}
                    {request.assessment.recommendation && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Recommendation
                        </label>
                        <p className="text-gray-900 dark:text-white capitalize">
                          {request.assessment.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'log' && (
          <ChangeLog changeRequestId={request.id} projectId={request.project_id} />
        )}
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <ChangeRequestForm
          request={request}
          onSave={() => {
            loadRequest();
            setShowEditForm(false);
          }}
          onCancel={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
}


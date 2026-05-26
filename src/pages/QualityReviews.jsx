import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Plus, Search, Calendar, Clock } from 'lucide-react';
import { getQualityReviews, deleteQualityReview } from '../services/qualityManagementService';
import QualityReviewForm from '../components/quality/QualityReviewForm';
import ExportListMenu from '../components/ui/ExportListMenu';
import { supabase } from '../services/supabaseClient';
import { TableRowNumberHeader, TableRowNumberCell } from '../components/ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'

export default function QualityReviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [projects, setProjects] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [filters, setFilters] = useState({
    project_id: '',
    quality_register_id: '',
    review_status: '',
    search: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setFilters(prev => ({ ...prev, project_id: selectedProjectId }));
    }
    fetchReviews();
  }, [filters, selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true });

      if (data) setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await getQualityReviews(filters);
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      alert('Error loading quality reviews: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = () => {
    setSelectedReview(null);
    setShowReviewForm(true);
  };

  const handleEditReview = (review) => {
    setSelectedReview(review);
    setShowReviewForm(true);
  };

  const handleReviewSaved = () => {
    setShowReviewForm(false);
    setSelectedReview(null);
    fetchReviews();
  };

  const handleDelete = async (review) => {
    if (!window.confirm(`Are you sure you want to delete review "${review.review_title}"?`)) return;
    try {
      setDeleting(review.id);
      await deleteQualityReview(review.id);
      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Error deleting review: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'planned':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/platform/quality-management')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              Quality Reviews
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Plan and manage quality reviews
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportListMenu
              columns={[
                { key: 'review_title', label: 'Review' },
                { key: 'review_reference', label: 'Reference' },
                { key: 'review_type', label: 'Type' },
                { key: 'product_name', label: 'Product/Deliverable' },
                { key: 'planned_date', label: 'Planned Date' },
                { key: 'review_status', label: 'Status' },
                { key: 'overall_score', label: 'Score' },
                { key: 'issues_found_count', label: 'Issues' },
                { key: 'project_name', label: 'Project' },
              ]}
              data={reviews.map(r => ({
                review_title: r.review_title,
                review_reference: r.review_reference || '',
                review_type: r.review_type || '',
                product_name: r.quality_register?.product_name || 'N/A',
                planned_date: r.planned_date || '',
                review_status: r.review_status || '',
                overall_score: r.overall_score != null ? `${Math.round(r.overall_score)}%` : '',
                issues_found_count: r.issues_found_count ?? '',
                project_name: r.project?.project_name || '',
              }))}
              baseFilename="Quality-Reviews"
              disabled={reviews.length === 0}
            />
            <button
              onClick={handleCreateReview}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Review
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.review_status || ''}
            onChange={(e) => setFilters({ ...filters, review_status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Quality Reviews
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create your first quality review to start tracking quality assessments
          </p>
          <button
            onClick={handleCreateReview}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create First Review
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Review
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Product/Deliverable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Planned Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reviews.map((review, index) => (
                  <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.review_title}
                        </div>
                        {review.review_reference && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {review.review_reference}
                          </div>
                        )}
                        {review.project && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {review.project.project_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {review.review_type?.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {review.quality_register ? (
                        <div className="text-sm text-gray-900 dark:text-white">
                          {review.quality_register.product_name}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {review.planned_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(review.planned_date).toLocaleDateString()}
                        </div>
                      ) : (
                        'Not scheduled'
                      )}
                      {review.planned_duration_minutes && (
                        <div className="text-xs text-gray-400 mt-1">
                          {review.planned_duration_minutes} min
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(review.review_status)}`}>
                        {review.review_status === 'in-progress' && <Clock className="h-3 w-3" />}
                        {review.review_status === 'completed' && <CheckCircle className="h-3 w-3" />}
                        {review.review_status?.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {review.overall_score !== null ? (
                        <div className={`text-sm font-semibold ${
                          review.overall_score >= 90 ? 'text-green-600 dark:text-green-400' :
                          review.overall_score >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {Math.round(review.overall_score)}%
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not scored</span>
                      )}
                      {review.issues_found_count > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {review.issues_found_count} issues
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditReview(review)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-2"
                        title="Edit Review"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(review)}
                        disabled={deleting === review.id}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        title="Delete Review"
                      >
                        {deleting === review.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && (
        <QualityReviewForm
          review={selectedReview}
          projectId={selectedProjectId || null}
          qualityRegisterId={selectedRegisterId || null}
          onSave={handleReviewSaved}
          onCancel={() => {
            setShowReviewForm(false);
            setSelectedReview(null);
          }}
        />
      )}
    </div>
  );
}


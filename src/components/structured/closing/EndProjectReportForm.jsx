import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, FileText, Target, TrendingUp, DollarSign, CheckCircle, AlertTriangle, Users, Lightbulb } from 'lucide-react';
import { createEndProjectReport, updateEndProjectReport } from '../../../services/closingProjectService';

export default function EndProjectReportForm({ projectId, report, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [users, setUsers] = useState([]);
  const [closures, setClosures] = useState([]);
  const [formData, setFormData] = useState({
    report_title: report?.report_title || '',
    report_date: report?.report_date || new Date().toISOString().split('T')[0],
    executive_summary: report?.executive_summary || '',
    project_objectives_met: report?.project_objectives_met || '',
    deliverables_summary: report?.deliverables_summary || '',
    performance_against_plan: report?.performance_against_plan || '',
    budget_summary: report?.budget_summary || '',
    quality_summary: report?.quality_summary || '',
    risk_issue_summary: report?.risk_issue_summary || '',
    stakeholder_feedback: report?.stakeholder_feedback || '',
    lessons_learned_summary: report?.lessons_learned_summary || '',
    recommendations: report?.recommendations || '',
    benefits_forecast: report?.benefits_forecast || '',
    closure_recommendation: report?.closure_recommendation || 'recommend-closure',
    report_status: report?.report_status || 'draft',
    prepared_by: report?.prepared_by || '',
    approved_by: report?.approved_by || '',
    approval_date: report?.approval_date || '',
    project_closure_id: report?.project_closure_id || ''
  });

  useEffect(() => {
    fetchUsers();
    fetchClosures();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchClosures = async () => {
    try {
      const { data, error } = await supabase
        .from('project_closures')
        .select('id, closure_type, closure_status')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClosures(data || []);
    } catch (error) {
      console.error('Error fetching closures:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const reportData = {
        project_id: projectId,
        report_title: formData.report_title,
        report_date: formData.report_date,
        executive_summary: formData.executive_summary,
        project_objectives_met: formData.project_objectives_met,
        deliverables_summary: formData.deliverables_summary,
        performance_against_plan: formData.performance_against_plan,
        budget_summary: formData.budget_summary,
        quality_summary: formData.quality_summary,
        risk_issue_summary: formData.risk_issue_summary,
        stakeholder_feedback: formData.stakeholder_feedback,
        lessons_learned_summary: formData.lessons_learned_summary,
        recommendations: formData.recommendations,
        benefits_forecast: formData.benefits_forecast,
        closure_recommendation: formData.closure_recommendation,
        report_status: formData.report_status,
        prepared_by: formData.prepared_by || null,
        approved_by: formData.approved_by || null,
        approval_date: formData.approval_date || null,
        project_closure_id: formData.project_closure_id || null
      };

      if (report) {
        reportData.updated_by = user.id;
        await updateEndProjectReport(report.id, reportData);
      } else {
        reportData.created_by = user.id;
        await createEndProjectReport(reportData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving end project report:', error);
      alert('Error saving end project report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'objectives', label: 'Objectives & Deliverables', icon: Target },
    { id: 'performance', label: 'Performance & Budget', icon: TrendingUp },
    { id: 'quality', label: 'Quality & Risks', icon: CheckCircle },
    { id: 'stakeholders', label: 'Stakeholders & Feedback', icon: Users },
    { id: 'lessons', label: 'Lessons & Recommendations', icon: Lightbulb },
    { id: 'closure', label: 'Closure & Approval', icon: CheckCircle }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Report Title *
              </label>
              <input
                type="text"
                value={formData.report_title}
                onChange={(e) => setFormData({ ...formData, report_title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="End Project Report - [Project Name]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Report Date *
                </label>
                <input
                  type="date"
                  value={formData.report_date}
                  onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Report Status *
                </label>
                <select
                  value={formData.report_status}
                  onChange={(e) => setFormData({ ...formData, report_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Executive Summary *
              </label>
              <textarea
                value={formData.executive_summary}
                onChange={(e) => setFormData({ ...formData, executive_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Provide a high-level overview of the project, its outcomes, and key highlights..."
                required
              />
            </div>
          </div>
        );

      case 'objectives':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Project Objectives Met *
              </label>
              <textarea
                value={formData.project_objectives_met}
                onChange={(e) => setFormData({ ...formData, project_objectives_met: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe how each project objective was met or not met..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Deliverables Summary *
              </label>
              <textarea
                value={formData.deliverables_summary}
                onChange={(e) => setFormData({ ...formData, deliverables_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="List all deliverables and their acceptance status..."
                required
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Objectives & Deliverables Checklist
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>Original project objectives from Project Brief</li>
                <li>Measurable success criteria</li>
                <li>Deliverable acceptance status</li>
                <li>Any scope changes and approvals</li>
                <li>Deviations from original plan</li>
              </ul>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Performance Against Plan *
              </label>
              <textarea
                value={formData.performance_against_plan}
                onChange={(e) => setFormData({ ...formData, performance_against_plan: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Compare actual performance against baseline plan (schedule, cost, scope)..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Budget Summary *
              </label>
              <textarea
                value={formData.budget_summary}
                onChange={(e) => setFormData({ ...formData, budget_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Final budget position, variances, and financial performance..."
                required
              />
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                Performance Metrics to Include
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-400 space-y-1 list-disc list-inside">
                <li>Schedule Performance Index (SPI)</li>
                <li>Cost Performance Index (CPI)</li>
                <li>Budget variance (planned vs. actual)</li>
                <li>Schedule variance (planned vs. actual dates)</li>
                <li>Resource utilization</li>
                <li>Change requests processed</li>
              </ul>
            </div>
          </div>
        );

      case 'quality':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Quality Summary *
              </label>
              <textarea
                value={formData.quality_summary}
                onChange={(e) => setFormData({ ...formData, quality_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe quality metrics, testing results, and acceptance criteria met..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Risk & Issue Summary *
              </label>
              <textarea
                value={formData.risk_issue_summary}
                onChange={(e) => setFormData({ ...formData, risk_issue_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Summarize key risks and issues encountered and how they were managed..."
                required
              />
            </div>
          </div>
        );

      case 'stakeholders':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Stakeholder Feedback *
              </label>
              <textarea
                value={formData.stakeholder_feedback}
                onChange={(e) => setFormData({ ...formData, stakeholder_feedback: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Summarize feedback received from key stakeholders..."
                required
              />
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">
                Stakeholder Feedback Sources
              </h4>
              <ul className="text-sm text-purple-800 dark:text-purple-400 space-y-1 list-disc list-inside">
                <li>Executive sponsor feedback</li>
                <li>Project board comments</li>
                <li>Customer/client satisfaction surveys</li>
                <li>End user feedback</li>
                <li>Team retrospective insights</li>
                <li>External stakeholder reviews</li>
              </ul>
            </div>
          </div>
        );

      case 'lessons':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Lessons Learned Summary *
              </label>
              <textarea
                value={formData.lessons_learned_summary}
                onChange={(e) => setFormData({ ...formData, lessons_learned_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Summarize key lessons learned from the project..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Recommendations *
              </label>
              <textarea
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Provide recommendations for future similar projects..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Benefits Forecast *
              </label>
              <textarea
                value={formData.benefits_forecast}
                onChange={(e) => setFormData({ ...formData, benefits_forecast: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Forecast of expected benefits and when they will be realized..."
                required
              />
            </div>
          </div>
        );

      case 'closure':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Project Closure
              </label>
              <select
                value={formData.project_closure_id}
                onChange={(e) => setFormData({ ...formData, project_closure_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select associated closure...</option>
                {closures.map((closure) => (
                  <option key={closure.id} value={closure.id}>
                    {closure.closure_type} - {closure.closure_status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Closure Recommendation *
              </label>
              <select
                value={formData.closure_recommendation}
                onChange={(e) => setFormData({ ...formData, closure_recommendation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="recommend-closure">Recommend Closure</option>
                <option value="recommend-continuation">Recommend Continuation</option>
                <option value="recommend-review">Recommend Further Review</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Users className="h-4 w-4" />
                  Prepared By
                </label>
                <select
                  value={formData.prepared_by}
                  onChange={(e) => setFormData({ ...formData, prepared_by: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Users className="h-4 w-4" />
                  Approved By
                </label>
                <select
                  value={formData.approved_by}
                  onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Approval Date
              </label>
              <input
                type="date"
                value={formData.approval_date}
                onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {report ? 'Edit End Project Report' : 'Create End Project Report'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Comprehensive final report documenting project completion
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <nav className="flex overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">{renderSection()}</div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : report ? 'Update Report' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

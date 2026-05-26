import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, FileText, CheckCircle, Calendar, TrendingUp, Target, Users } from 'lucide-react';
import { createProjectClosure, updateProjectClosure } from '../../../services/closingProjectService';

import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
export default function ProjectClosureForm({ projectId, closure, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [boards, setBoards] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    closure_type: closure?.closure_type || 'planned',
    closure_status: closure?.closure_status || 'initiated',
    closure_phase: closure?.closure_phase || 'preparation',
    planned_closure_date: closure?.planned_closure_date || '',
    actual_closure_date: closure?.actual_closure_date || '',
    closure_reason: closure?.closure_reason || '',
    performance_summary: closure?.performance_summary || '',
    benefits_realization_summary: closure?.benefits_realization_summary || '',
    financial_closure_summary: closure?.financial_closure_summary || '',
    resource_release_status: closure?.resource_release_status || 'not-started',
    stakeholder_acceptance: closure?.stakeholder_acceptance || 'pending',
    checklist_completion_percentage: closure?.checklist_completion_percentage || 0,
    final_approval_date: closure?.final_approval_date || '',
    project_board_id: closure?.project_board_id || '',
    prepared_by: closure?.prepared_by || '',
    approved_by: closure?.approved_by || ''
  });

  useEffect(() => {
    fetchBoards();
    fetchUsers();
  }, []);

  const fetchBoards = async () => {
    try {
      const { data, error } = await supabase
        .from('project_boards')
        .select('id, board_name')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('board_name');

      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const closureData = {
        project_id: projectId,
        closure_type: formData.closure_type,
        closure_status: formData.closure_status,
        closure_phase: formData.closure_phase,
        planned_closure_date: formData.planned_closure_date || null,
        actual_closure_date: formData.actual_closure_date || null,
        closure_reason: formData.closure_reason,
        performance_summary: formData.performance_summary,
        benefits_realization_summary: formData.benefits_realization_summary,
        financial_closure_summary: formData.financial_closure_summary,
        resource_release_status: formData.resource_release_status,
        stakeholder_acceptance: formData.stakeholder_acceptance,
        checklist_completion_percentage: formData.checklist_completion_percentage,
        final_approval_date: formData.final_approval_date || null,
        project_board_id: formData.project_board_id || null,
        prepared_by: formData.prepared_by || null,
        approved_by: formData.approved_by || null
      };

      if (closure) {
        closureData.updated_by = user.id;
        await updateProjectClosure(closure.id, closureData);
      } else {
        closureData.created_by = user.id;
        await createProjectClosure(closureData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving project closure:', error);
      alert('Error saving project closure: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'summary', label: 'Performance', icon: TrendingUp },
    { id: 'benefits', label: 'Benefits & Finance', icon: Target },
    { id: 'resources', label: 'Resources & Stakeholders', icon: Users },
    { id: 'approval', label: 'Approval', icon: CheckCircle }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Closure Type *
                </label>
                <select
                  value={formData.closure_type}
                  onChange={(e) => setFormData({ ...formData, closure_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="planned">Planned Closure</option>
                  <option value="early">Early Closure</option>
                  <option value="premature">Premature Closure</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Closure Status *
                </label>
                <select
                  value={formData.closure_status}
                  onChange={(e) => setFormData({ ...formData, closure_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="initiated">Initiated</option>
                  <option value="in-progress">In Progress</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Closure Phase *
                </label>
                <select
                  value={formData.closure_phase}
                  onChange={(e) => setFormData({ ...formData, closure_phase: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="preparation">Preparation</option>
                  <option value="documentation">Documentation</option>
                  <option value="handover">Handover</option>
                  <option value="final-approval">Final Approval</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Project Board
                </label>
                <select
                  value={formData.project_board_id}
                  onChange={(e) => setFormData({ ...formData, project_board_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select project board...</option>
                  {boards.map((board, index) => (
                    <option key={board.id} value={board.id}>
                      {board.board_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="h-4 w-4" />
                  Planned Closure Date
                </label>
                <input
                  type="date"
                  value={formData.planned_closure_date}
                  onChange={(e) => setFormData({ ...formData, planned_closure_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="h-4 w-4" />
                  Actual Closure Date
                </label>
                <input
                  type="date"
                  value={formData.actual_closure_date}
                  onChange={(e) => setFormData({ ...formData, actual_closure_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Closure Reason *
              </label>
              <textarea
                value={formData.closure_reason}
                onChange={(e) => setFormData({ ...formData, closure_reason: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Explain why the project is being closed..."
                required
              />
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Performance Summary *
              </label>
              <textarea
                value={formData.performance_summary}
                onChange={(e) => setFormData({ ...formData, performance_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Summarize overall project performance, key achievements, and challenges encountered..."
                required
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Performance Summary Guidelines
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>Schedule performance against baseline</li>
                <li>Budget performance and cost variance</li>
                <li>Quality metrics and deliverable acceptance</li>
                <li>Scope completion and change management</li>
                <li>Key achievements and successes</li>
                <li>Major challenges and how they were addressed</li>
              </ul>
            </div>
          </div>
        );

      case 'benefits':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Benefits Realization Summary *
              </label>
              <textarea
                value={formData.benefits_realization_summary}
                onChange={(e) => setFormData({ ...formData, benefits_realization_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe the benefits achieved and ongoing benefits measurement plans..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Financial Closure Summary *
              </label>
              <textarea
                value={formData.financial_closure_summary}
                onChange={(e) => setFormData({ ...formData, financial_closure_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Summarize final budget position, cost closure, and financial sign-off..."
                required
              />
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                Financial Closure Checklist
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-400 space-y-1 list-disc list-inside">
                <li>All project costs accounted for</li>
                <li>Final budget variance documented</li>
                <li>Outstanding invoices processed</li>
                <li>Purchase orders closed</li>
                <li>Financial records archived</li>
                <li>Cost center closure completed</li>
              </ul>
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Resource Release Status *
              </label>
              <select
                value={formData.resource_release_status}
                onChange={(e) => setFormData({ ...formData, resource_release_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="partial">Partial Release</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Stakeholder Acceptance *
              </label>
              <select
                value={formData.stakeholder_acceptance}
                onChange={(e) => setFormData({ ...formData, stakeholder_acceptance: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial Acceptance</option>
                <option value="accepted">Accepted</option>
                <option value="accepted-with-conditions">Accepted with Conditions</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Checklist Completion: {formData.checklist_completion_percentage}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.checklist_completion_percentage}
                onChange={(e) => setFormData({ ...formData, checklist_completion_percentage: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">
                Resource Release Checklist
              </h4>
              <ul className="text-sm text-purple-800 dark:text-purple-400 space-y-1 list-disc list-inside">
                <li>Team members released to new assignments</li>
                <li>Equipment and assets returned/reassigned</li>
                <li>Office space and facilities released</li>
                <li>Vendor contracts closed</li>
                <li>Software licenses deprovisioned</li>
                <li>Access rights revoked</li>
              </ul>
            </div>
          </div>
        );

      case 'approval':
        return (
          <div className="space-y-6">
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
                  {users.map((user, index) => (
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
                  {users.map((user, index) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4" />
                Final Approval Date
              </label>
              <input
                type="date"
                value={formData.final_approval_date}
                onChange={(e) => setFormData({ ...formData, final_approval_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                Final Approval Requirements
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1 list-disc list-inside">
                <li>All project deliverables completed and accepted</li>
                <li>End Project Report prepared and reviewed</li>
                <li>Lessons Learned documented</li>
                <li>Follow-on actions defined and assigned</li>
                <li>Handover completed to operational teams</li>
                <li>Financial closure approved</li>
                <li>Stakeholder sign-off obtained</li>
              </ul>
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
              {closure ? 'Edit Project Closure' : 'Initiate Project Closure'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage project closure process and documentation
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
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
              {loading ? 'Saving...' : closure ? 'Update Closure' : 'Initiate Closure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

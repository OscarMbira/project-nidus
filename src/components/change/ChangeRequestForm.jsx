import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { X, FileText, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { createChangeRequest, updateChangeRequest } from '../../services/changeManagementService';

export default function ChangeRequestForm({ projectId, request, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [boards, setBoards] = useState([]);
  const [formData, setFormData] = useState({
    change_title: request?.change_title || '',
    change_description: request?.change_description || '',
    change_category: request?.change_category || 'scope',
    change_type: request?.change_type || 'enhancement',
    reason_for_change: request?.reason_for_change || '',
    current_situation: request?.current_situation || '',
    proposed_solution: request?.proposed_solution || '',
    alternative_solutions: request?.alternative_solutions || '',
    priority: request?.priority || 'medium',
    urgency: request?.urgency || 'medium',
    business_criticality: request?.business_criticality || 'medium',
    submission_date: request?.submission_date || new Date().toISOString().split('T')[0],
    requestor_name: request?.requestor_name || '',
    requestor_organization: request?.requestor_organization || '',
    change_board_id: request?.change_board_id || '',
    notes: request?.notes || ''
  });

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const { data, error } = await supabase
        .from('change_board')
        .select('id, board_name')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .eq('is_deleted', false);

      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const requestData = {
        project_id: projectId,
        change_title: formData.change_title,
        change_description: formData.change_description,
        change_category: formData.change_category,
        change_type: formData.change_type,
        reason_for_change: formData.reason_for_change,
        current_situation: formData.current_situation,
        proposed_solution: formData.proposed_solution,
        alternative_solutions: formData.alternative_solutions,
        priority: formData.priority,
        urgency: formData.urgency,
        business_criticality: formData.business_criticality,
        submission_date: formData.submission_date,
        requestor_name: formData.requestor_name,
        requestor_organization: formData.requestor_organization,
        change_board_id: formData.change_board_id || null,
        notes: formData.notes,
        status: request ? request.status : 'submitted'
      };

      if (request) {
        requestData.updated_by = user.id;
        await updateChangeRequest(request.id, requestData);
      } else {
        requestData.submitted_by = user.id;
        requestData.created_by = user.id;
        await createChangeRequest(requestData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving change request:', error);
      alert('Error saving change request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'details', label: 'Change Details', icon: AlertTriangle },
    { id: 'solutions', label: 'Solutions', icon: Target },
    { id: 'priority', label: 'Priority & Impact', icon: TrendingUp }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Change Title *
              </label>
              <input
                type="text"
                value={formData.change_title}
                onChange={(e) => setFormData({ ...formData, change_title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Brief title describing the change..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Change Description *
              </label>
              <textarea
                value={formData.change_description}
                onChange={(e) => setFormData({ ...formData, change_description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Detailed description of the proposed change..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Category *
                </label>
                <select
                  value={formData.change_category}
                  onChange={(e) => setFormData({ ...formData, change_category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="scope">Scope</option>
                  <option value="schedule">Schedule</option>
                  <option value="budget">Budget</option>
                  <option value="quality">Quality</option>
                  <option value="resource">Resource</option>
                  <option value="risk">Risk</option>
                  <option value="technical">Technical</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Type *
                </label>
                <select
                  value={formData.change_type}
                  onChange={(e) => setFormData({ ...formData, change_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="corrective">Corrective Action</option>
                  <option value="preventive">Preventive Action</option>
                  <option value="enhancement">Enhancement</option>
                  <option value="defect-fix">Defect Fix</option>
                  <option value="regulatory">Regulatory Requirement</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Submission Date *
                </label>
                <input
                  type="date"
                  value={formData.submission_date}
                  onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Change Board
                </label>
                <select
                  value={formData.change_board_id}
                  onChange={(e) => setFormData({ ...formData, change_board_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select board...</option>
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.board_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Requestor Name
                </label>
                <input
                  type="text"
                  value={formData.requestor_name}
                  onChange={(e) => setFormData({ ...formData, requestor_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="If not the submitter..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Requestor Organization
                </label>
                <input
                  type="text"
                  value={formData.requestor_organization}
                  onChange={(e) => setFormData({ ...formData, requestor_organization: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Department or organization..."
                />
              </div>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Reason for Change *
              </label>
              <textarea
                value={formData.reason_for_change}
                onChange={(e) => setFormData({ ...formData, reason_for_change: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Why is this change necessary?"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Current Situation
              </label>
              <textarea
                value={formData.current_situation}
                onChange={(e) => setFormData({ ...formData, current_situation: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe the current state or problem..."
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Change Justification Guidelines
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>Clearly articulate the business need</li>
                <li>Explain impact of not making the change</li>
                <li>Reference any dependencies or constraints</li>
                <li>Include supporting data or evidence</li>
              </ul>
            </div>
          </div>
        );

      case 'solutions':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Proposed Solution *
              </label>
              <textarea
                value={formData.proposed_solution}
                onChange={(e) => setFormData({ ...formData, proposed_solution: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Detailed description of the proposed solution..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Alternative Solutions
              </label>
              <textarea
                value={formData.alternative_solutions}
                onChange={(e) => setFormData({ ...formData, alternative_solutions: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Other options considered..."
              />
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                Solution Description Best Practices
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-400 space-y-1 list-disc list-inside">
                <li>Be specific about what will be changed</li>
                <li>Include implementation approach</li>
                <li>Identify resources required</li>
                <li>Estimate time and cost impacts</li>
                <li>Consider alternative approaches</li>
              </ul>
            </div>
          </div>
        );

      case 'priority':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Priority *
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Urgency *
                </label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="immediate">Immediate</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Business Criticality *
                </label>
                <select
                  value={formData.business_criticality}
                  onChange={(e) => setFormData({ ...formData, business_criticality: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Any additional information..."
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                Priority Assessment Guide
              </h4>
              <div className="text-sm text-yellow-800 dark:text-yellow-400 space-y-2">
                <p><strong>Critical/Immediate:</strong> Blocking work, safety issue, compliance requirement</p>
                <p><strong>High/High:</strong> Significant impact on schedule, cost, or quality</p>
                <p><strong>Medium/Medium:</strong> Moderate impact, can be scheduled</p>
                <p><strong>Low/Low:</strong> Nice-to-have, minimal impact</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {request ? 'Edit Change Request' : 'Submit Change Request'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Document and submit a change request for review
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
              {loading ? 'Saving...' : request ? 'Update Request' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

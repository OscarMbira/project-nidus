import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, FileText, Calendar, Target, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { createEndStageReport, updateEndStageReport, fetchStageBoundaries } from '../../../services/stageBoundariesService';

export default function EndStageReportForm({ projectId, boardId, report, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [stageBoundaries, setStageBoundaries] = useState([]);
  const [activeSection, setActiveSection] = useState('basic'); // basic, performance, quality, forecast, approval
  const [formData, setFormData] = useState({
    report_title: report?.report_title || '',
    report_date: report?.report_date || new Date().toISOString().split('T')[0],
    stage_boundary_id: report?.stage_boundary_id || '',
    stage_name: report?.stage_name || '',
    stage_number: report?.stage_number || 1,
    stage_status: report?.stage_status || 'completed',

    // Performance
    stage_objectives_summary: report?.stage_objectives_summary || '',
    stage_objectives_met: report?.stage_objectives_met ?? true,
    stage_deliverables_summary: report?.stage_deliverables_summary || '',
    deliverables_acceptance_status: report?.deliverables_acceptance_status || 'all-accepted',

    // Schedule
    planned_start_date: report?.planned_start_date || '',
    actual_start_date: report?.actual_start_date || '',
    planned_end_date: report?.planned_end_date || '',
    actual_end_date: report?.actual_end_date || '',
    schedule_variance_days: report?.schedule_variance_days || 0,
    schedule_performance_index: report?.schedule_performance_index || 1.0,

    // Cost
    planned_budget: report?.planned_budget || '',
    actual_cost: report?.actual_cost || '',
    cost_variance: report?.cost_variance || '',
    cost_performance_index: report?.cost_performance_index || 1.0,

    // Quality
    quality_criteria_met: report?.quality_criteria_met || 0,
    quality_criteria_total: report?.quality_criteria_total || 0,
    quality_performance_percentage: report?.quality_performance_percentage || 100,
    quality_issues_summary: report?.quality_issues_summary || '',

    // Risks & Issues
    risks_closed: report?.risks_closed || 0,
    risks_transferred_to_next_stage: report?.risks_transferred_to_next_stage || 0,
    issues_closed: report?.issues_closed || 0,
    issues_transferred_to_next_stage: report?.issues_transferred_to_next_stage || 0,

    // Lessons Learned
    lessons_learned: report?.lessons_learned || '',
    what_went_well: report?.what_went_well || '',
    what_could_improve: report?.what_could_improve || '',
    recommendations: report?.recommendations || '',

    // Forecast
    next_stage_forecast: report?.next_stage_forecast || '',
    anticipated_challenges: report?.anticipated_challenges || '',
    recommended_actions: report?.recommended_actions || '',

    // Tolerances
    tolerance_breaches_occurred: report?.tolerance_breaches_occurred ?? false,
    tolerance_breaches_details: report?.tolerance_breaches_details || '',

    // Approval
    approval_status: report?.approval_status || 'draft',
    notes: report?.notes || ''
  });

  useEffect(() => {
    fetchStages();
  }, [projectId]);

  const fetchStages = async () => {
    try {
      const data = await fetchStageBoundaries(projectId);
      setStageBoundaries(data || []);
    } catch (error) {
      console.error('Error fetching stage boundaries:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate variances
      const scheduleVariance = formData.actual_end_date && formData.planned_end_date
        ? Math.floor((new Date(formData.actual_end_date) - new Date(formData.planned_end_date)) / (1000 * 60 * 60 * 24))
        : 0;

      const costVariance = formData.actual_cost && formData.planned_budget
        ? parseFloat(formData.actual_cost) - parseFloat(formData.planned_budget)
        : 0;

      const reportData = {
        project_id: projectId,
        board_id: boardId || null,
        stage_boundary_id: formData.stage_boundary_id,
        report_title: formData.report_title,
        report_date: formData.report_date,
        stage_name: formData.stage_name,
        stage_number: parseInt(formData.stage_number),
        stage_status: formData.stage_status,

        stage_objectives_summary: formData.stage_objectives_summary,
        stage_objectives_met: formData.stage_objectives_met,
        stage_deliverables_summary: formData.stage_deliverables_summary,
        deliverables_acceptance_status: formData.deliverables_acceptance_status,

        planned_start_date: formData.planned_start_date || null,
        actual_start_date: formData.actual_start_date || null,
        planned_end_date: formData.planned_end_date || null,
        actual_end_date: formData.actual_end_date || null,
        schedule_variance_days: scheduleVariance,
        schedule_performance_index: parseFloat(formData.schedule_performance_index),

        planned_budget: formData.planned_budget ? parseFloat(formData.planned_budget) : null,
        actual_cost: formData.actual_cost ? parseFloat(formData.actual_cost) : null,
        cost_variance: costVariance,
        cost_performance_index: parseFloat(formData.cost_performance_index),

        quality_criteria_met: parseInt(formData.quality_criteria_met),
        quality_criteria_total: parseInt(formData.quality_criteria_total),
        quality_performance_percentage: parseFloat(formData.quality_performance_percentage),
        quality_issues_summary: formData.quality_issues_summary,

        risks_closed: parseInt(formData.risks_closed),
        risks_transferred_to_next_stage: parseInt(formData.risks_transferred_to_next_stage),
        issues_closed: parseInt(formData.issues_closed),
        issues_transferred_to_next_stage: parseInt(formData.issues_transferred_to_next_stage),

        lessons_learned: formData.lessons_learned,
        what_went_well: formData.what_went_well,
        what_could_improve: formData.what_could_improve,
        recommendations: formData.recommendations,

        next_stage_forecast: formData.next_stage_forecast,
        anticipated_challenges: formData.anticipated_challenges,
        recommended_actions: formData.recommended_actions,

        tolerance_breaches_occurred: formData.tolerance_breaches_occurred,
        tolerance_breaches_details: formData.tolerance_breaches_details,

        approval_status: formData.approval_status,
        notes: formData.notes
      };

      if (report) {
        reportData.updated_by = user.id;
        await updateEndStageReport(report.id, reportData);
      } else {
        reportData.prepared_by = user.id;
        reportData.created_by = user.id;
        await createEndStageReport(reportData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving end stage report:', error);
      alert('Error saving end stage report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'quality', label: 'Quality & Risks', icon: CheckCircle },
    { id: 'forecast', label: 'Lessons & Forecast', icon: Target },
    { id: 'approval', label: 'Approval', icon: CheckCircle }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {report ? 'Edit End Stage Report' : 'Create End Stage Report'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Document stage completion and performance review
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
        <div className="flex gap-2 px-6 pt-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 font-medium text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  activeSection === section.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          {/* Basic Information Section */}
          {activeSection === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FileText className="h-4 w-4" />
                    Report Title *
                  </label>
                  <input
                    type="text"
                    value={formData.report_title}
                    onChange={(e) => setFormData({ ...formData, report_title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="End Stage Report - [Stage Name]"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="h-4 w-4" />
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
                    Stage Boundary
                  </label>
                  <select
                    value={formData.stage_boundary_id}
                    onChange={(e) => setFormData({ ...formData, stage_boundary_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select stage boundary...</option>
                    {stageBoundaries.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        Stage {stage.stage_number}: {stage.stage_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Stage Name *
                  </label>
                  <input
                    type="text"
                    value={formData.stage_name}
                    onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Stage Number *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.stage_number}
                    onChange={(e) => setFormData({ ...formData, stage_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Stage Status *
                  </label>
                  <select
                    value={formData.stage_status}
                    onChange={(e) => setFormData({ ...formData, stage_status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="completed">Completed</option>
                    <option value="terminated-early">Terminated Early</option>
                    <option value="extended">Extended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Stage Objectives Summary
                </label>
                <textarea
                  value={formData.stage_objectives_summary}
                  onChange={(e) => setFormData({ ...formData, stage_objectives_summary: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Summarize the stage objectives and outcomes..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="objectives_met"
                  checked={formData.stage_objectives_met}
                  onChange={(e) => setFormData({ ...formData, stage_objectives_met: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="objectives_met" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Stage objectives were met
                </label>
              </div>
            </div>
          )}

          {/* Performance Section */}
          {activeSection === 'performance' && (
            <div className="space-y-6">
              {/* Schedule Performance */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Schedule Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Planned Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.planned_start_date}
                      onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Actual Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.actual_start_date}
                      onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Planned End Date
                    </label>
                    <input
                      type="date"
                      value={formData.planned_end_date}
                      onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Actual End Date
                    </label>
                    <input
                      type="date"
                      value={formData.actual_end_date}
                      onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Schedule Performance Index (SPI)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.schedule_performance_index}
                      onChange={(e) => setFormData({ ...formData, schedule_performance_index: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">1.0 = on schedule, &gt;1.0 = ahead, &lt;1.0 = behind</p>
                  </div>
                </div>
              </div>

              {/* Cost Performance */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Cost Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Planned Budget ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.planned_budget}
                      onChange={(e) => setFormData({ ...formData, planned_budget: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Actual Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.actual_cost}
                      onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Cost Performance Index (CPI)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_performance_index}
                      onChange={(e) => setFormData({ ...formData, cost_performance_index: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">1.0 = on budget, &gt;1.0 = under, &lt;1.0 = over</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quality & Risks Section */}
          {activeSection === 'quality' && (
            <div className="space-y-6">
              {/* Quality */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Quality Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Quality Criteria Met
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quality_criteria_met}
                      onChange={(e) => setFormData({ ...formData, quality_criteria_met: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Total Quality Criteria
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quality_criteria_total}
                      onChange={(e) => setFormData({ ...formData, quality_criteria_total: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Performance %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.quality_performance_percentage}
                      onChange={(e) => setFormData({ ...formData, quality_performance_percentage: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Quality Issues Summary
                  </label>
                  <textarea
                    value={formData.quality_issues_summary}
                    onChange={(e) => setFormData({ ...formData, quality_issues_summary: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe any quality issues encountered..."
                  />
                </div>
              </div>

              {/* Risks & Issues */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Risks</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Risks Closed
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.risks_closed}
                        onChange={(e) => setFormData({ ...formData, risks_closed: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Risks Transferred to Next Stage
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.risks_transferred_to_next_stage}
                        onChange={(e) => setFormData({ ...formData, risks_transferred_to_next_stage: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Issues</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Issues Closed
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.issues_closed}
                        onChange={(e) => setFormData({ ...formData, issues_closed: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Issues Transferred to Next Stage
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.issues_transferred_to_next_stage}
                        onChange={(e) => setFormData({ ...formData, issues_transferred_to_next_stage: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lessons & Forecast Section */}
          {activeSection === 'forecast' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  What Went Well
                </label>
                <textarea
                  value={formData.what_went_well}
                  onChange={(e) => setFormData({ ...formData, what_went_well: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Document successes and positive outcomes..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  What Could Be Improved
                </label>
                <textarea
                  value={formData.what_could_improve}
                  onChange={(e) => setFormData({ ...formData, what_could_improve: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Document areas for improvement..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Lessons Learned
                </label>
                <textarea
                  value={formData.lessons_learned}
                  onChange={(e) => setFormData({ ...formData, lessons_learned: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Key lessons learned during this stage..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Next Stage Forecast
                </label>
                <textarea
                  value={formData.next_stage_forecast}
                  onChange={(e) => setFormData({ ...formData, next_stage_forecast: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Forecast for the next stage..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Anticipated Challenges
                </label>
                <textarea
                  value={formData.anticipated_challenges}
                  onChange={(e) => setFormData({ ...formData, anticipated_challenges: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Challenges expected in upcoming stages..."
                />
              </div>
            </div>
          )}

          {/* Approval Section */}
          {activeSection === 'approval' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Approval Status
                </label>
                <select
                  value={formData.approval_status}
                  onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under-review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <input
                  type="checkbox"
                  id="tolerance_breaches"
                  checked={formData.tolerance_breaches_occurred}
                  onChange={(e) => setFormData({ ...formData, tolerance_breaches_occurred: e.target.checked })}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="tolerance_breaches" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    Tolerance breaches occurred during this stage
                  </label>
                  {formData.tolerance_breaches_occurred && (
                    <textarea
                      value={formData.tolerance_breaches_details}
                      onChange={(e) => setFormData({ ...formData, tolerance_breaches_details: e.target.value })}
                      rows={3}
                      className="mt-3 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Describe the tolerance breaches and their impact..."
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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

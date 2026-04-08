/**
 * Benefits Review Plan Page
 * Main page for viewing and managing Benefits Review Plans
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft, Plus, FileText, Target, DollarSign, Calendar, AlertTriangle, History, CheckCircle, Share2 } from 'lucide-react';
import { getBenefitsReviewPlan, getOrCreatePlanForProject, getPlanBenefits, getPlanResources, getReviewSchedule } from '../services/benefitsReviewPlanService';
import { getDisBenefitsForPlan } from '../services/disBenefitsService';
import { getRevisionHistory, getApprovals, getDistributionList } from '../services/benefitsReviewPlanService';
import BenefitsReviewPlanView from '../components/benefits/BenefitsReviewPlanView';
import BenefitsReviewPlanForm from '../components/benefits/BenefitsReviewPlanForm';
import BenefitsReviewPlanHistory from '../components/benefits/BenefitsReviewPlanHistory';
import BenefitsReviewPlanApprovals from '../components/benefits/BenefitsReviewPlanApprovals';
import BenefitsReviewPlanDistribution from '../components/benefits/BenefitsReviewPlanDistribution';
import BenefitsCoverageSection from '../components/benefits/BenefitsCoverageSection';
import BenefitsReviewResources from '../components/benefits/BenefitsReviewResources';
import BenefitsReviewSchedule from '../components/benefits/BenefitsReviewSchedule';
import DisBenefitsSection from '../components/benefits/DisBenefitsSection';
import { exportBenefitsReviewPlanToPDF, printBenefitsReviewPlan } from '../utils/benefitsReviewPlanExport';
import ExportRecordButtons from '../components/ui/ExportRecordButtons';
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils';

const BRP_VIEW_SECTIONS = [
  { title: 'Plan', fields: [
    { key: 'brp_reference', label: 'Reference' },
    { key: 'plan_title', label: 'Title' },
    { key: 'status', label: 'Status' }
  ]}
];

export default function BenefitsReviewPlan() {
  const { projectId, routeKey } = usePlatformProjectId();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, [projectId]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      // Try to get existing plan or create one
      const data = await getOrCreatePlanForProject(projectId);
      setPlan(data);
      
      if (data?.id) {
        // Fetch related data
        await Promise.all([
          fetchCoverage(data.id),
          fetchResources(data.id),
          fetchReviews(data.id),
          fetchDisBenefits(data.id),
          fetchHistory(data.id),
          fetchApprovals(data.id),
          fetchDistribution(data.id),
        ]);
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      alert('Error loading Benefits Review Plan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoverage = async (planId) => {
    try {
      const data = await getPlanBenefits(planId);
      setCoverage(data);
    } catch (error) {
      console.error('Error fetching coverage:', error);
    }
  };

  const fetchResources = async (planId) => {
    try {
      const data = await getPlanResources(planId);
      setResources(data);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchReviews = async (planId) => {
    try {
      const data = await getReviewSchedule(planId);
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchDisBenefits = async (planId) => {
    try {
      const data = await getDisBenefitsForPlan(planId);
      setDisBenefits(data);
    } catch (error) {
      console.error('Error fetching dis-benefits:', error);
    }
  };

  const fetchHistory = async (planId) => {
    try {
      const data = await getRevisionHistory(planId);
      setRevisions(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchApprovals = async (planId) => {
    try {
      const data = await getApprovals(planId);
      setApprovals(data);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    }
  };

  const fetchDistribution = async (planId) => {
    try {
      const data = await getDistributionList(planId);
      setDistribution(data);
    } catch (error) {
      console.error('Error fetching distribution:', error);
    }
  };

  const handleRefresh = async () => {
    await fetchPlan();
  };

  const handleSave = () => {
    setShowForm(false);
    fetchPlan();
  };

  const handleEdit = () => {
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  const handleExport = async () => {
    if (!plan) return;
    
    try {
      await exportBenefitsReviewPlanToPDF(
        plan,
        coverage,
        resources,
        reviews,
        disBenefits,
        revisions,
        approvals,
        distribution
      );
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF: ' + error.message);
    }
  };

  const handlePrint = () => {
    if (!plan) return;
    
    try {
      printBenefitsReviewPlan(
        plan,
        coverage,
        resources,
        reviews,
        disBenefits,
        revisions,
        approvals,
        distribution
      );
    } catch (error) {
      console.error('Error printing:', error);
      alert('Error printing: ' + error.message);
    }
  };

  const handleApprove = () => {
    // TODO: Navigate to approvals section
    alert('Approvals management coming soon');
  };

  const handleDistribute = () => {
    // TODO: Navigate to distribution section
    alert('Distribution management coming soon');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading Benefits Review Plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Benefits Review Plan
          </h1>
          {!showForm && plan && (
            <div className="flex items-center gap-2">
              <ExportRecordButtons
                onExportPPT={() => exportRecordToPPT(BRP_VIEW_SECTIONS, plan, `BenefitsReviewPlan_${plan.brp_reference || plan.id}`)}
                onExportWord={() => exportRecordToWord(BRP_VIEW_SECTIONS, plan, `BenefitsReviewPlan_${plan.brp_reference || plan.id}`)}
                onExportExcel={() => exportRecordToExcel(BRP_VIEW_SECTIONS, plan, `BenefitsReviewPlan_${plan.brp_reference || plan.id}`)}
                onExportCSV={() => exportRecordToCSV(BRP_VIEW_SECTIONS, plan, `BenefitsReviewPlan_${plan.brp_reference || plan.id}`)}
                onExportXML={() => exportRecordToXML(BRP_VIEW_SECTIONS, plan, `BenefitsReviewPlan_${plan.brp_reference || plan.id}`)}
                onExportJSON={() => exportRecordToJSON(BRP_VIEW_SECTIONS, plan, `BenefitsReviewPlan_${plan.brp_reference || plan.id}`)}
                onExportPrint={() => exportRecordToPrint(BRP_VIEW_SECTIONS, plan, `BenefitsReviewPlan_${plan.brp_reference || plan.id}`)}
              />
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Edit Plan
              </button>
            </div>
          )}
          {!showForm && !plan && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Plan
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {showForm ? (
        <BenefitsReviewPlanForm
          plan={plan}
          projectId={projectId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <div className="space-y-6">
          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
        <BenefitsReviewPlanView
          plan={plan}
          onEdit={handleEdit}
          onExport={handleExport}
          onApprove={handleApprove}
          onDistribute={handleDistribute}
          onPrint={handlePrint}
        />
          )}

          {/* Tab Navigation */}
          {plan && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Overview', icon: FileText },
                    { id: 'coverage', label: 'Benefits Coverage', icon: Target },
                    { id: 'resources', label: 'Resources', icon: DollarSign },
                    { id: 'schedule', label: 'Review Schedule', icon: Calendar },
                    { id: 'disbenefits', label: 'Dis-benefits', icon: AlertTriangle },
                    { id: 'history', label: 'Document History', icon: History },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                          activeTab === tab.id
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
              <div className="p-6">
                {activeTab === 'coverage' && (
                  <BenefitsCoverageSection
                    planId={plan.id}
                    projectId={projectId}
                    onUpdate={handleRefresh}
                  />
                )}

                {activeTab === 'resources' && (
                  <BenefitsReviewResources
                    planId={plan.id}
                    onUpdate={handleRefresh}
                  />
                )}

                {activeTab === 'schedule' && (
                  <BenefitsReviewSchedule
                    planId={plan.id}
                    projectId={projectId}
                    onUpdate={handleRefresh}
                  />
                )}

                {activeTab === 'disbenefits' && (
                  <DisBenefitsSection
                    planId={plan.id}
                    projectId={projectId}
                    onUpdate={handleRefresh}
                  />
                )}

                {activeTab === 'history' && (
                  <div className="space-y-6">
                    <BenefitsReviewPlanHistory
                      planId={plan.id}
                      onUpdate={handleRefresh}
                    />
                    <BenefitsReviewPlanApprovals
                      planId={plan.id}
                      planStatus={plan.status}
                      onUpdate={handleRefresh}
                    />
                    <BenefitsReviewPlanDistribution
                      planId={plan.id}
                      onUpdate={handleRefresh}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Registration wizard — Step 3: Industry (v918, CLAUDE.md Phase 5)
 * Multi-select industries, one marked primary, optional sub-industry per selected industry.
 * No DB write here — accumulates into wizard state, submitted at Workspace Setup.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Factory } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getIndustryCategories, getIndustrySegments } from '../../../services/organisationCustomRoleService';
import WizardStepLayout from './WizardStepLayout';

export default function IndustrySelectionStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const orgFormData = location.state?.orgFormData;
  const prevSelection = location.state?.industrySelection;

  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(() => new Set(prevSelection?.industryCategoryIds || []));
  const [primaryId, setPrimaryId] = useState(prevSelection?.primaryIndustryId || null);
  const [segmentsByIndustry, setSegmentsByIndustry] = useState({});
  const [segmentIdByIndustry, setSegmentIdByIndustry] = useState(() => ({ ...(prevSelection?.segmentIdsByIndustry || {}) }));

  useEffect(() => {
    if (!orgFormData) {
      navigate('/onboarding/organisation-setup', { replace: true });
    }
  }, [orgFormData, navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getIndustryCategories();
      if (result.success) {
        setIndustries(result.data);
      } else {
        toast.error(result.error || 'Failed to load industries');
      }
      setLoading(false);
    })();
  }, []);

  const toggleIndustry = async (industryId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(industryId)) {
        next.delete(industryId);
      } else {
        next.add(industryId);
      }
      return next;
    });
    setPrimaryId((prev) => {
      if (prev === industryId) return null; // deselected the current primary
      return prev;
    });

    if (!segmentsByIndustry[industryId]) {
      const result = await getIndustrySegments(industryId);
      if (result.success) {
        setSegmentsByIndustry((prev) => ({ ...prev, [industryId]: result.data }));
      }
    }
  };

  const selectedList = useMemo(
    () => industries.filter((i) => selectedIds.has(i.id)),
    [industries, selectedIds]
  );

  const canContinue = selectedIds.size > 0 && primaryId && selectedIds.has(primaryId);

  const handleContinue = () => {
    if (!canContinue) {
      toast.error('Select at least one industry and mark one as primary.');
      return;
    }
    navigate('/onboarding/professional-role', {
      state: {
        orgFormData,
        industrySelection: {
          industryCategoryIds: Array.from(selectedIds),
          primaryIndustryId: primaryId,
          segmentIdsByIndustry: segmentIdByIndustry,
        },
      },
    });
  };

  if (!orgFormData) return null;

  return (
    <WizardStepLayout
      stepId="industry"
      icon={Factory}
      title="Which industry are you running Project Nidus for?"
      subtitle="Select every industry that applies, then mark your main one as primary. This unlocks the industry menus and features built for your work."
    >
      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading industries...</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {industries.map((industry) => {
              const checked = selectedIds.has(industry.id);
              const segments = segmentsByIndustry[industry.id] || [];
              return (
                <div
                  key={industry.id}
                  className={`border rounded-lg p-4 transition ${
                    checked
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIndustry(industry.id)}
                      className="mt-1 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{industry.name}</span>
                  </label>

                  {checked && (
                    <div className="mt-3 pl-7 space-y-3">
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <input
                          type="radio"
                          name="primaryIndustry"
                          checked={primaryId === industry.id}
                          onChange={() => setPrimaryId(industry.id)}
                        />
                        Primary industry
                      </label>

                      {segments.length > 0 && (
                        <select
                          value={segmentIdByIndustry[industry.id] || ''}
                          onChange={(e) =>
                            setSegmentIdByIndustry((prev) => ({ ...prev, [industry.id]: e.target.value || null }))
                          }
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">No specific sub-industry (optional)</option>
                          {segments.map((seg) => (
                            <option key={seg.id} value={seg.id}>{seg.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedList.length > 0 && !primaryId && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Mark one selected industry as primary to continue.
            </p>
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}
    </WizardStepLayout>
  );
}

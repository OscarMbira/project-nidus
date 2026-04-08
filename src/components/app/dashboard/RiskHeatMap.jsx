/**
 * Risk Heat Map Component
 *
 * Displays risk distribution and heat map
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { useEffect, useState, memo } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { getRiskHeatMapData } from '../../../services/dashboardService';

const PROBABILITY_LEVELS = ['low', 'medium', 'high'];
const IMPACT_LEVELS = ['low', 'medium', 'high'];

const getRiskColor = (score) => {
  if (score >= 15) return 'bg-red-600 text-white';
  if (score >= 8) return 'bg-yellow-600 text-white';
  return 'bg-green-600 text-white';
};

const getRiskBgColor = (score) => {
  if (score >= 15) return 'bg-red-900/40';
  if (score >= 8) return 'bg-yellow-900/40';
  return 'bg-green-900/40';
};

const RiskHeatMap = memo(function RiskHeatMap({ organizationId }) {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRiskData();
  }, [organizationId]);

  const loadRiskData = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    const result = await getRiskHeatMapData(organizationId);

    if (result.success) {
      setRiskData(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Risk Heat Map</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Risk Heat Map</h3>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          Error loading risk heat map: {error}
        </div>
      </div>
    );
  }

  if (!riskData) return null;

  // Create heat map grid
  const heatMapGrid = {};
  PROBABILITY_LEVELS.forEach(prob => {
    heatMapGrid[prob] = {};
    IMPACT_LEVELS.forEach(impact => {
      heatMapGrid[prob][impact] = [];
    });
  });

  // Populate grid with risks
  riskData.risks.forEach(risk => {
    if (heatMapGrid[risk.probability] && heatMapGrid[risk.probability][risk.impact]) {
      heatMapGrid[risk.probability][risk.impact].push(risk);
    }
  });

  const totalRisks = riskData.risks.length;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          Risk Heat Map
        </h3>
        <div className="text-2xl font-bold text-gray-100">{totalRisks} Risks</div>
      </div>

      {totalRisks === 0 ? (
        <div className="h-80 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No active risks</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-red-900/20 rounded-lg border border-red-500/30">
              <div className="text-2xl font-bold text-red-400">{riskData.summary.high}</div>
              <div className="text-xs text-gray-400 mt-1">High Risk</div>
            </div>
            <div className="text-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
              <div className="text-2xl font-bold text-yellow-400">{riskData.summary.medium}</div>
              <div className="text-xs text-gray-400 mt-1">Medium Risk</div>
            </div>
            <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-500/30">
              <div className="text-2xl font-bold text-green-400">{riskData.summary.low}</div>
              <div className="text-xs text-gray-400 mt-1">Low Risk</div>
            </div>
          </div>

          {/* Heat Map Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-4 gap-2">
                {/* Header Row */}
                <div className="p-2 text-center font-semibold text-gray-400 text-sm">
                  Probability / Impact
                </div>
                {IMPACT_LEVELS.map(impact => (
                  <div key={impact} className="p-2 text-center font-semibold text-gray-300 text-sm capitalize">
                    {impact}
                  </div>
                ))}

                {/* Heat Map Rows */}
                {[...PROBABILITY_LEVELS].reverse().map(probability => (
                  <React.Fragment key={probability}>
                    <div className="p-2 flex items-center font-semibold text-gray-300 text-sm capitalize">
                      {probability}
                    </div>
                    {IMPACT_LEVELS.map(impact => {
                      const risks = heatMapGrid[probability][impact];
                      const score = calculateScore(probability, impact);
                      const colorClass = getRiskColor(score);
                      const bgClass = getRiskBgColor(score);

                      return (
                        <div
                          key={`${probability}-${impact}`}
                          className={`${bgClass} border border-gray-600 rounded p-3 min-h-[80px] flex flex-col items-center justify-center hover:border-gray-500 transition-colors cursor-pointer`}
                          title={`${risks.length} risk(s) - Score: ${score}`}
                        >
                          <div className={`text-xl font-bold ${
                            score >= 15 ? 'text-red-400' :
                            score >= 8 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {risks.length}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Score: {score}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Top Risks List */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Top Risks</h4>
            <div className="space-y-2">
              {riskData.risks
                .sort((a, b) => b.riskScore - a.riskScore)
                .slice(0, 5)
                .map(risk => (
                  <div
                    key={risk.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded border border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`w-5 h-5 ${
                        risk.riskScore >= 15 ? 'text-red-400' :
                        risk.riskScore >= 8 ? 'text-yellow-400' :
                        'text-green-400'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-gray-200">{risk.name}</div>
                        <div className="text-xs text-gray-400">{risk.projectName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        risk.riskScore >= 15 ? 'text-red-400' :
                        risk.riskScore >= 8 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        Score: {risk.riskScore}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {risk.probability} / {risk.impact}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

RiskHeatMap.displayName = 'RiskHeatMap';

export default RiskHeatMap;

// Helper function to calculate risk score
function calculateScore(probability, impact) {
  const probValues = { low: 1, medium: 3, high: 5 };
  const impactValues = { low: 1, medium: 3, high: 5 };
  return (probValues[probability] || 3) * (impactValues[impact] || 3);
}

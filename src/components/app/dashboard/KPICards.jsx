/**
 * KPI Cards Component
 *
 * Displays Key Performance Indicators for the organization
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import { useEffect, useState, memo } from 'react';
import { TrendingUp, TrendingDown, Minus, Heart, Clock, DollarSign, Users } from 'lucide-react';
import { getKPIs } from '../../../services/dashboardService';

const KPICards = memo(function KPICards({ organizationId }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadKPIs();
  }, [organizationId]);

  const loadKPIs = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    const result = await getKPIs(organizationId);

    if (result.success) {
      setKpis(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const getTrendIcon = (value) => {
    if (value > 0) return TrendingUp;
    if (value < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = (value, isPositiveGood = true) => {
    if (value === 0) return 'text-gray-400';
    if (isPositiveGood) {
      return value > 0 ? 'text-green-400' : 'text-red-400';
    } else {
      return value > 0 ? 'text-red-400' : 'text-green-400';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
        Error loading KPIs: {error}
      </div>
    );
  }

  if (!kpis) return null;

  const kpiCards = [
    {
      title: 'Project Health',
      icon: Heart,
      value: `${kpis.projectHealth.score}`,
      unit: '%',
      subtitle: `${kpis.projectHealth.healthy} Healthy, ${kpis.projectHealth.atRisk} At Risk, ${kpis.projectHealth.critical} Critical`,
      color: kpis.projectHealth.score >= 80 ? 'text-green-400' : kpis.projectHealth.score >= 60 ? 'text-yellow-400' : 'text-red-400',
      bgColor: kpis.projectHealth.score >= 80 ? 'bg-green-900/20' : kpis.projectHealth.score >= 60 ? 'bg-yellow-900/20' : 'bg-red-900/20',
    },
    {
      title: 'On-Time Delivery',
      icon: Clock,
      value: `${kpis.onTimeDelivery.percentage}`,
      unit: '%',
      subtitle: `${kpis.onTimeDelivery.count} of ${kpis.onTimeDelivery.total} delivered on time`,
      color: kpis.onTimeDelivery.percentage >= 80 ? 'text-green-400' : kpis.onTimeDelivery.percentage >= 60 ? 'text-yellow-400' : 'text-red-400',
      bgColor: kpis.onTimeDelivery.percentage >= 80 ? 'bg-green-900/20' : kpis.onTimeDelivery.percentage >= 60 ? 'bg-yellow-900/20' : 'bg-red-900/20',
    },
    {
      title: 'Budget Variance',
      icon: DollarSign,
      value: `${Math.abs(kpis.budgetVariance.percentage)}`,
      unit: '%',
      subtitle: kpis.budgetVariance.percentage > 0 ? 'Over Budget' : kpis.budgetVariance.percentage < 0 ? 'Under Budget' : 'On Budget',
      color: getTrendColor(kpis.budgetVariance.percentage, false),
      bgColor: kpis.budgetVariance.percentage === 0 ? 'bg-green-900/20' : Math.abs(kpis.budgetVariance.percentage) <= 10 ? 'bg-yellow-900/20' : 'bg-red-900/20',
      prefix: kpis.budgetVariance.percentage > 0 ? '+' : kpis.budgetVariance.percentage < 0 ? '-' : '',
    },
    {
      title: 'Resource Efficiency',
      icon: Users,
      value: `${kpis.resourceEfficiency.percentage}`,
      unit: '%',
      subtitle: `${kpis.resourceEfficiency.utilized} of ${kpis.resourceEfficiency.allocated} hours utilized`,
      color: kpis.resourceEfficiency.percentage >= 75 ? 'text-green-400' : kpis.resourceEfficiency.percentage >= 50 ? 'text-yellow-400' : 'text-red-400',
      bgColor: kpis.resourceEfficiency.percentage >= 75 ? 'bg-green-900/20' : kpis.resourceEfficiency.percentage >= 50 ? 'bg-yellow-900/20' : 'bg-red-900/20',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-100">Key Performance Indicators</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <div
            key={index}
            className={`${kpi.bgColor} rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all`}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-300">{kpi.title}</h4>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>

            <div className="mb-2">
              <span className={`text-4xl font-bold ${kpi.color}`}>
                {kpi.prefix}{kpi.value}
              </span>
              <span className={`text-xl font-semibold ${kpi.color} ml-1`}>
                {kpi.unit}
              </span>
            </div>

            <p className="text-xs text-gray-400">{kpi.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

KPICards.displayName = 'KPICards';

export default KPICards;

import { useState } from 'react';
import { TrendingUp, Target, DollarSign } from 'lucide-react';
import StrategicContributionScorer from '../components/strategy/StrategicContributionScorer';
import ObjectiveForm from '../components/strategy/ObjectiveForm';
import { saveStrategicContribution } from '../services/strategicService';

export default function StrategicContribution() {
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [selectedContributionData, setSelectedContributionData] = useState(null);

  const handleAdd = (data) => {
    setSelectedContributionData(data);
    setShowContributionForm(true);
  };

  const handleEdit = (contribution) => {
    setSelectedContributionData(contribution);
    setShowContributionForm(true);
  };

  const handleContributionSaved = () => {
    setShowContributionForm(false);
    setSelectedContributionData(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Strategic Contributions
          </h1>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track and score how projects contribute to strategic objectives
        </p>
      </div>

      <StrategicContributionScorer
        onAdd={handleAdd}
        onEdit={handleEdit}
      />

      {/* Contribution Form Modal - TODO: Create proper contribution form component */}
    </div>
  );
}


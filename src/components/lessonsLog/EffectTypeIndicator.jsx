/**
 * Effect Type Indicator Component
 * Visual indicator for positive/negative/neutral effects
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function EffectTypeIndicator({ effectType }) {
  const getEffectConfig = (effectType) => {
    switch (effectType) {
      case 'positive':
        return {
          label: 'Positive',
          icon: TrendingUp,
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          iconClassName: 'text-green-600 dark:text-green-400'
        };
      case 'negative':
        return {
          label: 'Negative',
          icon: TrendingDown,
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          iconClassName: 'text-red-600 dark:text-red-400'
        };
      case 'neutral':
        return {
          label: 'Neutral',
          icon: Minus,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
          iconClassName: 'text-gray-600 dark:text-gray-400'
        };
      default:
        return {
          label: 'Neutral',
          icon: Minus,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
          iconClassName: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const config = getEffectConfig(effectType);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {config.label}
    </span>
  );
}

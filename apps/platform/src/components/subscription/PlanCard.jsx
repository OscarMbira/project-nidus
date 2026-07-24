/**
 * Plan Card Component
 * Displays subscription plan details with selection
 */

import React from 'react';
import { CheckCircle, Star } from 'lucide-react';

const PlanCard = ({ plan, isSelected, onSelect }) => {
  const features = Array.isArray(plan.features)
    ? plan.features
    : JSON.parse(plan.features || '[]');

  return (
    <div
      onClick={onSelect}
      className={`bg-gray-800 rounded-xl p-6 cursor-pointer transition transform hover:scale-105 ${
        isSelected ? 'ring-2 ring-blue-600 shadow-xl' : 'hover:bg-gray-750'
      } ${plan.is_popular ? 'border-2 border-blue-600' : 'border border-gray-700'}`}
    >
      {/* Popular Badge */}
      {plan.is_popular && (
        <div className="flex items-center justify-center gap-1 bg-blue-600 text-white text-xs font-semibold py-1 px-3 rounded-full mb-4 w-fit mx-auto">
          <Star className="w-3 h-3" fill="currentColor" />
          MOST POPULAR
        </div>
      )}

      {/* Plan Name */}
      <h3 className="text-2xl font-bold text-white mb-2 text-center">
        {plan.plan_name}
      </h3>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2">
          {plan.original_price && plan.original_price > plan.price && (
            <span className="text-gray-500 line-through text-lg">
              ${plan.original_price}
            </span>
          )}
          <span className="text-4xl font-bold text-white">
            ${plan.price}
          </span>
        </div>
        <div className="text-gray-400 text-sm mt-1">
          {plan.billing_cycle === 'lifetime' 
            ? 'one-time payment' 
            : `per ${plan.billing_cycle === 'monthly' ? 'month' : 'year'}`}
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-gray-300 text-sm">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Member Limit */}
      <div className="bg-gray-700 rounded-lg p-3 mb-4 text-center">
        <div className="text-white font-semibold">{plan.member_limit} Team Members</div>
        <div className="text-gray-400 text-xs">
          +${plan.additional_member_price}/member for additional seats
        </div>
      </div>

      {/* Select Button */}
      <button
        className={`w-full font-medium py-3 px-4 rounded-lg transition ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
      >
        {isSelected ? 'Selected' : 'Select Plan'}
      </button>
    </div>
  );
};

export default PlanCard;


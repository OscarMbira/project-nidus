import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeContext } from '../../context/ThemeContext';
import { Package, ShoppingCart, Check, Star } from 'lucide-react';
import { getScenarioPacks, processScenarioPackPurchase, userOwnsItem, updatePurchaseStatus } from '../../services/purchaseService';
import { PURCHASE_TYPES } from '../../services/purchaseService';
import { simDb } from '../../services/supabase/supabaseClient';
// import { loadStripe } from '@stripe/stripe-js'; // Stripe integration - install @stripe/stripe-js if needed

const ScenarioPacks = () => {
  const { theme } = useThemeContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [packs, setPacks] = useState([]);
  const [purchasing, setPurchasing] = useState(null);
  const [userId, setUserId] = useState(null);
  const [ownedPacks, setOwnedPacks] = useState(new Set());

  useEffect(() => {
    getCurrentUser();
    loadPacks();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
      if (user?.id) {
        loadOwnedPacks(user.id);
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadPacks = async () => {
    try {
      setLoading(true);
      const data = await getScenarioPacks({ featured: false });
      setPacks(data);
    } catch (error) {
      console.error('Error loading scenario packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOwnedPacks = async (userId) => {
    try {
      const owned = [];
      for (const pack of packs) {
        const owns = await userOwnsItem(userId, PURCHASE_TYPES.SCENARIO_PACK, pack.id);
        if (owns) {
          owned.push(pack.id);
        }
      }
      setOwnedPacks(new Set(owned));
    } catch (error) {
      console.error('Error loading owned packs:', error);
    }
  };

  useEffect(() => {
    if (userId && packs.length > 0) {
      loadOwnedPacks(userId);
    }
  }, [userId, packs]);

  const handlePurchase = async (pack) => {
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      setPurchasing(pack.id);
      const result = await processScenarioPackPurchase(userId, pack.id);

      // Redirect to Stripe Checkout
      // In production, this would use Stripe Checkout Session
      // For now, we'll use a simplified flow
      const { createCheckoutSession } = await import('../../services/stripeService');
      const { url } = await createCheckoutSession(
        `pack_${pack.id}`, // This would be a Stripe Price ID
        userId,
        `${window.location.origin}/simulator/subscription/success?purchase=${result.purchaseId}`,
        `${window.location.origin}/simulator/packs`
      );

      window.location.href = url;
    } catch (error) {
      console.error('Error purchasing pack:', error);
      alert('Error processing purchase: ' + error.message);
      setPurchasing(null);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Scenario Packs</h1>
        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Purchase curated collections of scenarios
        </p>
      </div>

      {/* Packs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packs.map((pack) => {
          const isOwned = ownedPacks.has(pack.id);
          const hasDiscount = pack.original_price && pack.original_price > pack.price;

          return (
            <div
              key={pack.id}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                pack.is_featured
                  ? 'border-blue-500 shadow-lg'
                  : theme === 'dark'
                  ? 'border-gray-700'
                  : 'border-gray-200'
              } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              {pack.is_featured && (
                <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Featured
                </div>
              )}

              {pack.thumbnail_url ? (
                <img
                  src={pack.thumbnail_url}
                  alt={pack.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Package className="w-16 h-16 text-white opacity-50" />
                </div>
              )}

              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{pack.name}</h3>
                <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {pack.short_description || pack.description}
                </p>

                <div className="flex items-center space-x-2 mb-4">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {pack.scenario_count} scenarios
                  </span>
                  {pack.industry && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {pack.industry}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    {hasDiscount && (
                      <p className="text-sm text-gray-500 line-through">
                        {formatCurrency(pack.original_price)}
                      </p>
                    )}
                    <p className="text-2xl font-bold">
                      {formatCurrency(pack.price)}
                    </p>
                    {hasDiscount && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {pack.discount_percentage}% off
                      </p>
                    )}
                  </div>
                  {pack.purchases_count > 0 && (
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">4.5</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {pack.purchases_count} purchases
                      </p>
                    </div>
                  )}
                </div>

                {isOwned ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-lg font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>Owned</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(pack)}
                    disabled={purchasing === pack.id}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      purchasing === pack.id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                    } text-white flex items-center justify-center space-x-2`}
                  >
                    {purchasing === pack.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        <span>Purchase Pack</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {packs.length === 0 && (
        <div className={`text-center py-12 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No scenario packs available at the moment
          </p>
        </div>
      )}
    </div>
  );
};

export default ScenarioPacks;


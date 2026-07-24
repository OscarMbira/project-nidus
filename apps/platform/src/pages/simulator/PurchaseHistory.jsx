import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Download, Receipt, Package, Award, FileText } from 'lucide-react';
import { getUserPurchases, generateReceipt } from '../../services/purchaseService';
import { simDb } from '../../services/supabase/supabaseClient';

const PurchaseHistory = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [filters, setFilters] = useState({
    itemType: '',
    status: '',
  });
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadPurchases();
    }
  }, [userId, filters]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const data = await getUserPurchases(userId, filters);
      setPurchases(data);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (purchaseId) => {
    try {
      const receipt = await generateReceipt(purchaseId);
      
      // In production, this would download a PDF
      // For now, show receipt data
      const receiptText = `
Receipt Number: ${receipt.receiptNumber}
Item: ${receipt.itemName}
Amount: ${receipt.currency} ${receipt.amount}
Date: ${new Date(receipt.purchasedAt).toLocaleDateString()}
Payment ID: ${receipt.paymentId}
      `.trim();

      // Create a blob and download
      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${receipt.receiptNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Error downloading receipt: ' + error.message);
    }
  };

  const getItemIcon = (itemType) => {
    switch (itemType) {
      case 'lifetime':
        return <Award className="w-5 h-5" />;
      case 'scenario_pack':
        return <Package className="w-5 h-5" />;
      case 'scenario':
        return <FileText className="w-5 h-5" />;
      case 'certificate':
      case 'physical_certificate':
        return <Award className="w-5 h-5" />;
      default:
        return <Receipt className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'refunded':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h1 className="text-2xl font-bold mb-2">Purchase History</h1>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          View all your purchases and download receipts
        </p>
      </div>

      {/* Filters */}
      <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex space-x-4">
          <select
            value={filters.itemType}
            onChange={(e) => setFilters({ ...filters, itemType: e.target.value })}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-200'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="">All Items</option>
            <option value="lifetime">Lifetime Access</option>
            <option value="scenario_pack">Scenario Packs</option>
            <option value="scenario">Individual Scenarios</option>
            <option value="certificate">Certificates</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-200'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Purchases List */}
      {purchases.length === 0 ? (
        <div className={`rounded-xl p-12 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No purchases found</h3>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {filters.itemType || filters.status
              ? 'Try adjusting your filters'
              : 'You haven\'t made any purchases yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase, index) => (
            <div
              key={purchase.id}
              className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {getItemIcon(purchase.item_type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{purchase.item_name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span className="capitalize">{purchase.item_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{new Date(purchase.purchased_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-xl font-bold">
                        {formatCurrency(purchase.amount, purchase.currency)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(purchase.payment_status)}`}
                      >
                        {purchase.payment_status}
                      </span>
                    </div>
                    {purchase.refund_amount && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        Refunded: {formatCurrency(purchase.refund_amount, purchase.currency)} on{' '}
                        {new Date(purchase.refunded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {purchase.payment_status === 'completed' && (
                    <button
                      onClick={() => handleDownloadReceipt(purchase.id)}
                      className={`p-2 rounded-lg ${
                        theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      } transition-colors`}
                      title="Download Receipt"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {purchases.length > 0 && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h3 className="font-semibold mb-4">Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Purchases
              </p>
              <p className="text-2xl font-bold">{purchases.length}</p>
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Spent
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  purchases
                    .filter(p => p.payment_status === 'completed')
                    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
                  'USD'
                )}
              </p>
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Completed
              </p>
              <p className="text-2xl font-bold text-green-500">
                {purchases.filter(p => p.payment_status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;


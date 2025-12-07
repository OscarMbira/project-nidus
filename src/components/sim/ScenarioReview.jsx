import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Star, ThumbsUp } from 'lucide-react';
import { simDb } from '../../services/supabase/supabaseClient';

const ScenarioReview = ({ scenarioId, userReview = null, onReviewSubmitted }) => {
  const { theme } = useTheme();
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [reviewText, setReviewText] = useState(userReview?.review_text || '');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await simDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const reviewData = {
        scenario_id: scenarioId,
        user_id: user.id,
        rating: rating,
        review_text: reviewText.trim() || null,
        is_verified_completion: true, // Could check if user completed scenario
      };

      let result;
      if (userReview) {
        // Update existing review
        const { data, error } = await simDb
          .from('scenario_reviews')
          .update(reviewData)
          .eq('id', userReview.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new review
        const { data, error } = await simDb
          .from('scenario_reviews')
          .insert(reviewData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      if (onReviewSubmitted) {
        onReviewSubmitted(result);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${
      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
    }`}>
      <h3 className="font-semibold mb-3">Write a Review</h3>
      
      {/* Rating */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Rating
        </label>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Review Text */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Your Review (Optional)
        </label>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience with this scenario..."
          rows={4}
          className={`w-full px-3 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-gray-200'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          rating === 0 || submitting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
        } text-white`}
      >
        {submitting ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
      </button>
    </div>
  );
};

export default ScenarioReview;


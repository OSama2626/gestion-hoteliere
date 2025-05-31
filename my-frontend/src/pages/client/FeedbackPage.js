import React, { useState } from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { submitFeedback } from '../../services/feedbackService';
import { Link } from 'react-router-dom';

const FeedbackPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0); // 0 for no rating, or 1-5
  // const [hotelId, setHotelId] = useState(''); // Optional: if feedback is hotel-specific

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!comment.trim()) {
      setError('Please enter your feedback comment.');
      return;
    }
    if (!user || !user.id) {
        setError('User information not found. Please ensure you are logged in.');
        return;
    }

    setIsSubmitting(true);
    const feedbackData = {
      userId: user.id,
      userEmail: user.email, // For context
      comment,
      rating: rating > 0 ? rating : undefined, // Only send rating if selected
      // hotelId: hotelId || undefined, // Only send if selected
    };
    console.log("FeedbackPage: Submitting feedback:", feedbackData);

    try {
      const result = await submitFeedback(feedbackData);
      setMessage(result.message);
      console.log("FeedbackPage: Feedback submission successful:", result);
      setComment('');
      setRating(0);
      // setHotelId('');
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.');
      console.error("FeedbackPage: Error submitting feedback:", err);
    }
    setIsSubmitting(false);
  };

  if (authLoading) {
    return <p>Loading user information...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <h1>Submit Feedback</h1>
        <p>Please <Link to="/login">login</Link> to submit feedback.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Submit Feedback</h1>
      <p>We value your opinion! Please let us know about your experience.</p>

      {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px', maxWidth: '500px' }}>
        {/* Optional: Hotel Selector
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="hotelId">Regarding Hotel (Optional):</label>
          <input type="text" id="hotelId" value={hotelId} onChange={(e) => setHotelId(e.target.value)} />
        </div>
        */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="rating">Rating (Optional):</label>
          <select
            id="rating"
            value={rating}
            onChange={(e) => setRating(parseInt(e.target.value))}
            disabled={isSubmitting}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          >
            <option value="0">No rating</option>
            <option value="1">1 - Poor</option>
            <option value="2">2 - Fair</option>
            <option value="3">3 - Good</option>
            <option value="4">4 - Very Good</option>
            <option value="5">5 - Excellent</option>
          </select>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="comment">Comment:</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            rows="5"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackPage;

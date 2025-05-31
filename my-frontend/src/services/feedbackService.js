const MOCK_API_DELAY_FB = 500;
let mockFeedbacks = [];
let nextFeedbackId = 1;

export const submitFeedback = async (feedbackData) => {
  // feedbackData should ideally include userId, comment. hotelId and rating are optional.
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!feedbackData.userId || !feedbackData.comment) {
        console.error('FeedbackService: Missing userId or comment for feedback.');
        return reject({ message: 'User ID and comment are required for feedback.' });
      }
      const newFeedback = {
        id: `fb-${nextFeedbackId++}`,
        ...feedbackData,
        createdAt: new Date().toISOString()
      };
      mockFeedbacks.push(newFeedback);
      console.log('FeedbackService: Feedback submitted:', newFeedback, 'All feedbacks:', mockFeedbacks);
      resolve({ message: 'Feedback submitted successfully!', feedback: newFeedback });
    }, MOCK_API_DELAY_FB);
  });
};

// Potential future function:
// export const getFeedbackForHotel = async (hotelId) => {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       const hotelFeedbacks = mockFeedbacks.filter(fb => fb.hotelId === hotelId);
//       resolve(hotelFeedbacks);
//     }, MOCK_API_DELAY_FB);
//   });
// };

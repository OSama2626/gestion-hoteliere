content: |
  // src/services/feedbackService.js
  const MOCK_API_DELAY = 500;

  let mockFeedbacks = [];
  let nextFeedbackId = 1;

  export const submitFeedback = async (feedbackData) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!feedbackData.userId || !feedbackData.message) { // Changed 'comment' to 'message' for consistency
          return reject({ message: 'User ID and message are required for feedback.' });
        }
        const newFeedback = {
          id: `fb-${nextFeedbackId++}`,
          ...feedbackData,
          createdAt: new Date().toISOString()
        };
        mockFeedbacks.push(newFeedback);
        console.log('Feedback submitted:', newFeedback, 'All feedbacks:', mockFeedbacks);
        resolve({ message: 'Feedback submitted successfully!', feedback: newFeedback });
      }, MOCK_API_DELAY);
    });
  };
```

// Mock API delay
const MOCK_API_DELAY = 1000;

// Mock reservations database (in a real app, this is backend)
let mockReservations = [];
import { addNotification } from './notificationService'; // Add this import
import { getToken } from './authService'; // Import getToken to fetch the auth token

export const createReservation = async (reservationDetails) => {
  console.log('reservationService.createReservation called with:', reservationDetails);

  const token = getToken();
  if (!token) {
    console.error('reservationService: No auth token found. User must be logged in.');
    return Promise.reject({ message: 'Authentication required. Please log in.' });
  }

  try {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(reservationDetails),
    });

    const data = await response.json();

    if (!response.ok) {
      // Backend might send errors in a specific format, e.g., data.message or data.error
      console.error('reservationService: Error creating reservation - HTTP status:', response.status, 'Response data:', data);
      throw new Error(data.message || data.error || `Failed to create reservation. Status: ${response.status}`);
    }

    // Assuming the backend response includes the created reservation object and a message
    // And that the created reservation object from backend includes an `id` and `userId`
    // and a `hotelName` (or enough details to construct it if needed for notification)
    // The previous mock used reservationDetails.hotelName and reservationDetails.userId for notification.
    // The actual backend response structure for the reservation object (`data.reservation` or `data`) needs to be confirmed.
    // For now, let's assume `data` itself is the reservation object or contains it as `data.reservation`.
    // Let's assume the backend returns the full reservation object including its new ID.
    
    const createdReservation = data.reservation || data; // Adjust if backend returns { reservation: ..., message: ... }

    // The addNotification function expects userId and hotelName.
    // reservationDetails from the frontend might still have hotelName, or we might need to get it from `createdReservation`
    // or adjust `addNotification` if the backend response structure is different.
    // For now, we'll assume `reservationDetails` still contains necessary info for the notification,
    // or that `createdReservation` (from backend) has it.
    // The backend response for a successful reservation creation (201) is typically the reservation object itself.
    // Let's assume `createdReservation.userId` and `createdReservation.hotel.name` are available if needed,
    // or use `reservationDetails.hotelName` if that's still passed and reliable.
    // The previous mock used `reservationDetails.userId` and `reservationDetails.hotelName`.
    // `reservationDetails` as passed to this function in the new structure does NOT have `userId` or `hotelName`.
    // This means `addNotification` call needs to be updated or the backend needs to provide these.
    // For now, I will use placeholder values or adapt if possible, acknowledging this might need adjustment.
    // The backend response should ideally contain the user ID associated with the reservation
    // and information about the hotel.

    // Let's assume the backend response (`createdReservation`) contains `id` (reservation ID)
    // and `User` object with `id` (userId), and `Hotel` object with `name` (hotelName).
    // This is a common pattern. If not, this notification part will fail or be inaccurate.
    // If the backend returns the populated reservation, it should have `createdReservation.id`
    // The `userId` should be derived from the token on backend, so it might be part of `createdReservation.User.id` or `createdReservation.userId`
    // The `hotelName` might be part of `createdReservation.Hotel.name`.

    // Safest approach: Use ID from created reservation. For other details, if not in response, this notification may be less detailed.
    // The original `addNotification` was:
    // addNotification(reservationDetails.userId, `Your reservation for ${reservationDetails.hotelName} (ID: ${newReservation.id}) ...`)
    // Since `reservationDetails.userId` and `reservationDetails.hotelName` are removed from `reservationDetails` object in HotelDetailPage.js,
    // we must rely on the backend response for these details if they are needed for the notification.
    // For now, let's assume the backend response `createdReservation` has `userId` and `hotelId` and we might need another call for hotelName
    // or the backend includes it.
    // Given the backend context, it's likely `createdReservation.userId` and `createdReservation.hotelId` exist.
    // We might not have `hotelName` directly.

    try {
      // Adapting notification: We need userId. If backend returns it with reservation, use it.
      // Hotel Name might be tricky if not returned.
      // Let's assume `createdReservation.userId` and `createdReservation.id` are available.
      // For hotelName, we might have to make the notification more generic or fetch hotel details.
      // For now, let's assume `reservationDetails.hotelId` is still available in the input `reservationDetails`
      // and we can use that for a more generic message if hotelName isn't directly in `createdReservation`.
      const userForNotification = createdReservation.userId || (createdReservation.User ? createdReservation.User.id : null);
      const hotelNameForNotification = createdReservation.Hotel ? createdReservation.Hotel.name : `Hotel ID ${createdReservation.hotelId}`;

      if (userForNotification && createdReservation.id) {
        await addNotification(
            userForNotification,
            `Your reservation for ${hotelNameForNotification} (ID: ${createdReservation.id}) is now pending validation.`,
            'reservation_pending',
            `/client/reservations#${createdReservation.id}`
        );
        console.log('reservationService: Notification added for new reservation.');
      } else {
        console.warn('reservationService: Could not add notification due to missing userId or reservationId in backend response.');
      }
    } catch (notificationError) {
       console.error("reservationService: Failed to add notification for new reservation", notificationError);
       // Non-critical error
    }

    console.log('reservationService: Reservation created successfully via API. Response:', data);
    // The promise should resolve with the data structure expected by the caller,
    // which previously was { reservation: newReservation, message: '...' }
    // If `data` is the reservation object, and backend sends a message property:
    return { reservation: createdReservation, message: data.message || 'Reservation request submitted successfully. Waiting for admin validation.' };

  } catch (error) {
    console.error('reservationService: Error in createReservation API call:', error);
    // Ensure the promise rejects with an object containing a message property
    return Promise.reject({ message: error.message || 'An unexpected error occurred while creating the reservation.' });
  }
};

// Example of how you might add other functions later:
// (existing code: MOCK_API_DELAY, mockReservations, createReservation)

export const getReservationsForUser = async (userId) => {
  console.log('reservationService.getReservationsForUser called for userId:', userId);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!userId) {
        console.error('reservationService: User ID is required to fetch reservations.');
        return reject({ message: 'User ID is required to fetch reservations.' });
      }
      const userReservations = mockReservations.filter(res => res.userId === userId);
      console.log(`reservationService: Found ${userReservations.length} reservations for user ${userId}:`, userReservations);
      resolve(userReservations);
    }, MOCK_API_DELAY);
  });
};

export const cancelReservation = async (reservationId, userId) => {
  console.log(`reservationService.cancelReservation called for resId: ${reservationId}, userId: ${userId}`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const reservationIndex = mockReservations.findIndex(res => res.id === reservationId);

      if (reservationIndex === -1) {
        console.warn(`reservationService: Reservation not found with ID: ${reservationId}`);
        return reject({ message: 'Reservation not found.' });
      }

      if (mockReservations[reservationIndex].userId !== userId) {
        console.warn(`reservationService: User ${userId} unauthorized to cancel reservation ${reservationId} owned by ${mockReservations[reservationIndex].userId}`);
        return reject({ message: 'Unauthorized to cancel this reservation.' });
      }

      // Simple cancellation logic: update status.
      if (['pending_admin_validation', 'confirmed'].includes(mockReservations[reservationIndex].status)) {
        mockReservations[reservationIndex].status = 'cancelled_by_client';
        console.log('reservationService: Reservation status updated to cancelled_by_client. DB:', mockReservations);
        resolve({ message: 'Reservation cancelled successfully.', reservation: mockReservations[reservationIndex] });
      } else {
        const currentStatus = mockReservations[reservationIndex].status;
        console.warn(`reservationService: Reservation ${reservationId} cannot be cancelled in its current state: ${currentStatus}`);
        reject({ message: `Reservation cannot be cancelled in its current state: ${currentStatus}` });
      }
    }, MOCK_API_DELAY);
  });
};

// Example of how you might add other functions later:
// export const getReservationsByUserId = async (userId) => { // This was a duplicate of getReservationsForUser
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       const userReservations = mockReservations.filter(res => res.userId === userId);
//       resolve(userReservations);
//     }, MOCK_API_DELAY);
//   });
// };

// export const cancelReservation = async (reservationId, userId) => {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       const index = mockReservations.findIndex(res => res.id === reservationId && res.userId === userId);
//       if (index === -1) {
//         return reject({ message: "Reservation not found or user not authorized to cancel." });
//       }
//       // Instead of deleting, you might change status, e.g., mockReservations[index].status = 'cancelled';
//       mockReservations.splice(index, 1);
//       resolve({ message: "Reservation cancelled successfully." });
//     }, MOCK_API_DELAY);
//   });
// };

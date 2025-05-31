```javascript
// src/services/reservationService.js
const MOCK_API_DELAY = 500;

// Mock reservations database (in a real app, this is backend)
let mockReservations = [];

export const createReservation = async (reservationDetails) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => { // Made async to await addNotification
      if (!reservationDetails.hotelId || !reservationDetails.userId ||
          !reservationDetails.roomType || !reservationDetails.startDate ||
          !reservationDetails.endDate || reservationDetails.numRooms <= 0) {
        return reject({ message: 'Missing required reservation details.' });
      }

      // Simulate checking room availability (very basic)
      const isRoomAvailable = true;

      if (!isRoomAvailable) {
        return reject({ message: `Rooms of type ${reservationDetails.roomType} are not available for the selected dates.` });
      }

      const newReservation = {
        id: `res-${nextReservationId++}`, // Ensure unique ID generation
        ...reservationDetails,
        status: 'pending_admin_validation', // Initial status
        createdAt: new Date().toISOString()
      };
      mockReservations.push(newReservation);
      console.log('Mock Reservations DB:', mockReservations);

      try {
        await addNotification(
            reservationDetails.userId,
            `Your reservation for ${reservationDetails.hotelName} (ID: ${newReservation.id}) is now pending validation.`,
            'reservation_pending',
            `/reservations/${newReservation.id}` // Example link, adjust as per your routing
        );
        console.log('Notification sent for new reservation.');
      } catch (notificationError) {
         console.error("Failed to add notification for new reservation", notificationError);
         // Decide if this should affect the overall success of reservation creation
      }
      resolve({ reservation: newReservation, message: 'Reservation request submitted successfully. Waiting for admin validation.' });
    }, MOCK_API_DELAY);
  });
};

export const getReservationsForUser = async (userId) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!userId) {
        return reject({ message: 'User ID is required to fetch reservations.' });
      }
      const userReservations = mockReservations.filter(res => res.userId === userId);
      console.log(`Fetched reservations for user ${userId}:`, userReservations);
      resolve(userReservations);
    }, MOCK_API_DELAY);
  });
};

export const cancelReservation = async (reservationId, userId) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const reservationIndex = mockReservations.findIndex(res => res.id === reservationId);

      if (reservationIndex === -1) {
        return reject({ message: 'Reservation not found.' });
      }

      if (mockReservations[reservationIndex].userId !== userId) {
        return reject({ message: 'Unauthorized to cancel this reservation.' });
      }

      // Simple cancellation logic: update status.
      if (['pending_admin_validation', 'confirmed'].includes(mockReservations[reservationIndex].status)) {
        mockReservations[reservationIndex].status = 'cancelled_by_client';
        console.log('Updated Mock Reservations DB after cancellation:', mockReservations);
        resolve({ message: 'Reservation cancelled successfully.', reservation: mockReservations[reservationIndex] });
      } else {
        reject({ message: `Reservation cannot be cancelled, status: ${mockReservations[reservationIndex].status}` });
      }
    }, MOCK_API_DELAY);
  });
};
```

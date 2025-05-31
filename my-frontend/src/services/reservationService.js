// Mock API delay
const MOCK_API_DELAY = 1000;

// Mock reservations database (in a real app, this is backend)
let mockReservations = [];
import { addNotification } from './notificationService'; // Add this import

export const createReservation = async (reservationDetails) => {
  console.log('reservationService.createReservation called with:', reservationDetails);
  return new Promise(async (resolve, reject) => { // Made outer function async for await
    setTimeout(async () => { // Made inner function async for await
      // Basic validation (in a real app, backend does more)
      if (!reservationDetails.hotelId || !reservationDetails.userId ||
          !reservationDetails.roomType || !reservationDetails.startDate ||
          !reservationDetails.endDate || !reservationDetails.numRooms || reservationDetails.numRooms <= 0) {
        console.error('reservationService: Missing required reservation details.');
        return reject({ message: 'Missing required reservation details.' });
      }

      // Simulate checking room availability (very basic)
      const isRoomAvailable = true; // Assume available for mock
      console.log('reservationService: Mock room availability check:', isRoomAvailable);

      if (!isRoomAvailable) {
        console.warn(`reservationService: Rooms of type ${reservationDetails.roomType} are not available.`);
        return reject({ message: `Rooms of type ${reservationDetails.roomType} are not available for the selected dates.` });
      }

      const newReservation = {
        id: `res-${Date.now().toString()}`,
        ...reservationDetails,
        status: 'pending_admin_validation', // Initial status
        createdAt: new Date().toISOString()
      };
      mockReservations.push(newReservation);

      try {
        await addNotification( // Await this
            reservationDetails.userId,
            `Your reservation for ${reservationDetails.hotelName} (ID: ${newReservation.id}) is now pending validation.`,
            'reservation_pending',
            `/client/reservations#${newReservation.id}` // Example link (fragment for potential scroll-to)
        );
        console.log('reservationService: Notification added for new reservation.');
      } catch (notificationError) {
         console.error("reservationService: Failed to add notification for new reservation", notificationError);
         // Non-critical error, so we don't reject the whole reservation process
         // The resolve message below will indicate success of reservation itself.
      }

      console.log('reservationService: New reservation added. Mock Reservations DB:', mockReservations);
      resolve({ reservation: newReservation, message: 'Reservation request submitted successfully. Waiting for admin validation.' });
    }, MOCK_API_DELAY);
  });
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

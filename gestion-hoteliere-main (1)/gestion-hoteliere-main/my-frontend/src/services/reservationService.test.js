import { createReservation } from './reservationService';
import { getToken } from './authService';
import { addNotification } from './notificationService';

// Mock the imported services
jest.mock('./authService');
jest.mock('./notificationService');

// Mock global fetch
global.fetch = jest.fn();

describe('createReservation in reservationService', () => {
  const mockReservationDetails = {
    hotelId: 1,
    checkInDate: '2024-08-01',
    checkOutDate: '2024-08-05',
    rooms: [{ roomTypeId: 101, quantity: 1 }],
  };
  const mockToken = 'test-auth-token';

  beforeEach(() => {
    // Clear all mocks before each test
    fetch.mockClear();
    getToken.mockClear();
    addNotification.mockClear();
  });

  describe('Successful Reservation', () => {
    it('should create a reservation, call addNotification, and resolve with reservation data', async () => {
      const mockApiResponse = {
        id: 'res-xyz-123',
        userId: 'user-789',
        hotelId: mockReservationDetails.hotelId,
        Hotel: { name: 'Grand Test Hotel' },
        checkInDate: mockReservationDetails.checkInDate,
        checkOutDate: mockReservationDetails.checkOutDate,
        rooms: mockReservationDetails.rooms,
        status: 'pending_admin_validation',
      };
      const mockServerMessage = 'Reservation successfully submitted.';

      getToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reservation: mockApiResponse, message: mockServerMessage }),
      });
      addNotification.mockResolvedValueOnce(undefined); // Assuming it's an async void function

      const result = await createReservation(mockReservationDetails);

      expect(getToken).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`,
        },
        body: JSON.stringify(mockReservationDetails),
      });
      expect(addNotification).toHaveBeenCalledTimes(1);
      expect(addNotification).toHaveBeenCalledWith(
        mockApiResponse.userId,
        `Your reservation for ${mockApiResponse.Hotel.name} (ID: ${mockApiResponse.id}) is now pending validation.`,
        'reservation_pending',
        `/client/reservations#${mockApiResponse.id}`
      );
      expect(result).toEqual({ reservation: mockApiResponse, message: mockServerMessage });
    });

    it('should handle API response where reservation is directly in data (not nested under "reservation" key)', async () => {
        const mockApiResponse = {
          id: 'res-abc-456',
          userId: 'user-123',
          hotelId: mockReservationDetails.hotelId,
          Hotel: { name: 'Another Test Hotel' },
          // ... other details
        };
        const mockServerMessage = 'Reservation created.';
  
        getToken.mockReturnValue(mockToken);
        fetch.mockResolvedValueOnce({
          ok: true,
          // Simulate backend returning the reservation object directly, and a message property alongside
          json: async () => ({ ...mockApiResponse, message: mockServerMessage }), 
        });
        addNotification.mockResolvedValueOnce(undefined);
  
        const result = await createReservation(mockReservationDetails);
  
        expect(fetch).toHaveBeenCalledTimes(1);
        // Check result assuming the service handles this structure correctly
        expect(result.reservation.id).toEqual(mockApiResponse.id);
        expect(result.message).toEqual(mockServerMessage);
        expect(addNotification).toHaveBeenCalledWith(
            mockApiResponse.userId,
            `Your reservation for ${mockApiResponse.Hotel.name} (ID: ${mockApiResponse.id}) is now pending validation.`,
            'reservation_pending',
            `/client/reservations#${mockApiResponse.id}`
          );
      });
  });

  describe('Failed Reservation - API Error', () => {
    it('should reject with the error message from API if response is not ok', async () => {
      const apiErrorMessage = 'Hotel does not have availability for the selected dates.';
      getToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: apiErrorMessage }),
      });

      await expect(createReservation(mockReservationDetails))
        .rejects
        .toEqual({ message: apiErrorMessage });

      expect(getToken).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`,
        },
        body: JSON.stringify(mockReservationDetails),
      });
      expect(addNotification).not.toHaveBeenCalled();
    });

    it('should use default error message if API error message is not in expected format', async () => {
        getToken.mockReturnValue(mockToken);
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal Server Error Object', details: {} }), // Non-standard error message
        });
  
        await expect(createReservation(mockReservationDetails))
          .rejects
          .toEqual({ message: 'Failed to create reservation. Status: 500' }); // Default error from service
  
        expect(addNotification).not.toHaveBeenCalled();
      });
  });

  describe('Failed Reservation - No Token', () => {
    it('should reject with an authentication error message if no token is found', async () => {
      getToken.mockReturnValue(null); // Simulate no token

      const expectedErrorMessage = { message: 'Authentication required. Please log in.' };

      await expect(createReservation(mockReservationDetails))
        .rejects
        .toEqual(expectedErrorMessage);

      expect(getToken).toHaveBeenCalledTimes(1);
      expect(fetch).not.toHaveBeenCalled();
      expect(addNotification).not.toHaveBeenCalled();
    });
  });
  
  describe('addNotification failure', () => {
    it('should still resolve reservation if addNotification fails', async () => {
        const mockApiResponse = {
            id: 'res-notify-fail-123',
            userId: 'user-notify-fail',
            hotelId: mockReservationDetails.hotelId,
            Hotel: { name: 'Notify Fail Hotel' },
            // ... other details
        };
        const mockServerMessage = 'Reservation submitted, notification failed but whatever.';

        getToken.mockReturnValue(mockToken);
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ reservation: mockApiResponse, message: mockServerMessage }),
        });
        // Simulate addNotification throwing an error
        addNotification.mockRejectedValueOnce(new Error('Failed to send notification'));

        // Spy on console.error to check if the notification error is logged
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await createReservation(mockReservationDetails);

        expect(result).toEqual({ reservation: mockApiResponse, message: mockServerMessage });
        expect(addNotification).toHaveBeenCalledTimes(1);
        // Check if the error from addNotification was logged by the service
        expect(consoleErrorSpy).toHaveBeenCalledWith("reservationService: Failed to add notification for new reservation", expect.any(Error));
        
        consoleErrorSpy.mockRestore(); // Restore console.error
    });
  });
});

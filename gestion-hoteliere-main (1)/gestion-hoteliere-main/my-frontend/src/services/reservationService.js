// Real Reservation Service

// Helper to get the auth token (assuming it's stored in localStorage)
// In a real app, this might come from an AuthContext or similar.
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Base URL for the API. Adjust if your backend is hosted elsewhere.
const API_BASE_URL = '/api'; // Assuming Express serves API routes under /api

/**
 * Handles API responses, checks for errors, and parses JSON.
 * @param {Response} response - The fetch API Response object.
 * @returns {Promise<any>} - The parsed JSON data.
 * @throws {Error} - If the response is not ok.
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    let errorMessage;
    try {
      errorData = await response.json();
      // Use server's error message if available, otherwise use a generic one.
      // The backend sends { "error": "message" } for some errors.
      errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
    } catch (e) {
      // If response is not JSON or parsing fails, use status text
      errorMessage = `HTTP error! status: ${response.status}, ${response.statusText}`;
      errorData = { message: response.statusText }; // Keep basic error data
    }
    const error = new Error(errorMessage);
    error.data = errorData; // Attach full error data if available
    error.status = response.status;
    throw error;
  }
  // If response is 204 No Content, there's no body to parse
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

/**
 * Creates a new reservation.
 * @param {object} reservationDetails - Details for the new reservation.
 *   Expected structure: { hotelId, checkInDate, checkOutDate, rooms: [{ roomTypeId, quantity }], specialRequests? }
 * @returns {Promise<object>} - The response from the backend (e.g., { message, reservationId, referenceNumber, totalAmount }).
 */
export const createReservation = async (reservationDetails) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(reservationDetails),
  });
  return handleResponse(response);
};

/**
 * Fetches reservations for the currently authenticated user.
 * @param {string} [statusFilter] - Optional status to filter reservations by (e.g., 'confirmed', 'cancelled').
 * @returns {Promise<Array<object>>} - An array of reservation objects.
 */
export const getReservationsForUser = async (statusFilter) => {
  const token = getAuthToken();
  let url = `${API_BASE_URL}/reservations/my-reservations`;
  if (statusFilter) {
    url += `?status=${statusFilter}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

/**
 * Cancels a reservation.
 * @param {string|number} reservationId - The ID of the reservation to cancel.
 * @returns {Promise<object>} - The response from the backend (e.g., { message: "Réservation annulée avec succès" }).
 */
export const cancelReservation = async (reservationId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

// Note: The addNotification import and related logic from the mock service
// has been removed as notifications should ideally be handled by the backend
// or a dedicated notification service integrated with backend events.

// Basic API helper functions (these might be in a shared utility file in a real app)
// Duplicated here for now. In a real app, import from a shared utils/api.js
const API_BASE_URL = '/api';

const getAuthToken = () => {
  const token = localStorage.getItem('authToken');
  if (!token) console.warn('Auth token not found for receptionReservationService.');
  return token;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    const error = new Error(errorData.message || `API Error: ${response.status}`);
    error.response = response;
    error.data = errorData;
    throw error;
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return response.text();
};

/**
 * Creates a new reservation by a reception agent for a specific client.
 * @param {object} reservationData - Data for the new reservation.
 *                                  Must include `userId` for the client.
 * @returns {Promise<object>} The created reservation details.
 */
export const createReservationByAgent = async (reservationData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reservations/agent-create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(reservationData),
  });
  return handleResponse(response);
};

/**
 * Fetches all reservations with filtering, accessible by reception agents.
 * @param {object} filters - Optional filters (e.g., { clientId, hotelId, dateFrom, dateTo, status, page, limit })
 * @returns {Promise<object>} Paginated list of reservations.
 */
export const getAllReservations = async (filters = {}) => {
  const token = getAuthToken();
  const queryParams = new URLSearchParams(filters).toString();

  const response = await fetch(`${API_BASE_URL}/reservations/all?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

/**
 * Updates an existing reservation by a reception agent.
 * @param {string|number} reservationId - The ID of the reservation to update.
 * @param {object} updateData - The data to update (e.g., { checkInDate, checkOutDate, status }).
 * @returns {Promise<object>} The updated reservation details.
 */
export const updateReservationByAgent = async (reservationId, updateData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/agent-update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });
  return handleResponse(response);
};

/**
 * Assigns or changes a specific room for a reservation by a reception agent.
 * @param {string|number} reservationId - The ID of the reservation.
 * @param {object} assignmentData - Data for room assignments (e.g., { assignments: [{ reservationRoomId, newRoomId }] }).
 * @returns {Promise<object>} Success message or updated details.
 */
export const assignRoomByAgent = async (reservationId, assignmentData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/assign-room`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(assignmentData),
  });
  return handleResponse(response);
};

/**
 * Checks in a reservation.
 * @param {string|number} reservationId - The ID of the reservation to check in.
 * @returns {Promise<object>} The updated reservation details.
 */
export const checkInReservation = async (reservationId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/check-in`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

/**
 * Checks out a reservation.
 * @param {string|number} reservationId - The ID of the reservation to check out.
 * @returns {Promise<object>} The updated reservation details.
 */
export const checkOutReservation = async (reservationId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/check-out`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

// Basic API helper functions (these might be in a shared utility file in a real app)
// Duplicated here for now. In a real app, import from a shared utils/api.js
const API_BASE_URL = '/api';

const getAuthToken = () => {
  const token = localStorage.getItem('authToken');
  if (!token) console.warn('Auth token not found for receptionConsumptionService.');
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
  // Handle cases where response might be empty but OK (e.g., 204 No Content from a DELETE)
  if (response.status === 204) return null;
  return response.text();
};

/**
 * Adds a consumption item to a specific reservation.
 * @param {string|number} reservationId - The ID of the reservation.
 * @param {object} itemData - Data for the consumption item
 *                            (e.g., { item_name, quantity, price_per_unit, item_description? }).
 * @returns {Promise<object>} The created consumption item.
 */
export const addConsumptionItem = async (reservationId, itemData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/consumptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(itemData),
  });
  return handleResponse(response);
};

/**
 * Retrieves all consumption items for a specific reservation.
 * Accessible by agents and the client who owns the reservation.
 * @param {string|number} reservationId - The ID of the reservation.
 * @returns {Promise<Array<object>>} A list of consumption items.
 */
export const getConsumptionItems = async (reservationId) => {
  const token = getAuthToken(); // Token needed for authorization, even if client can access
  const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/consumptions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

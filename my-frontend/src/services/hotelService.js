// STUB for hotelService.js
// In a real application, this would fetch data from the backend API.

// Basic API helper functions (these might be in a shared utility file in a real app)
// Duplicated here for now.
const API_BASE_URL = '/api';

const getAuthToken = () => {
  const token = localStorage.getItem('authToken');
  if (!token) console.warn('Auth token not found for hotelService (stub).');
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
 * Fetches a list of all hotels.
 * @returns {Promise<Array<object>>} A list of hotels.
 */
export const getHotels = async () => {
  console.log('STUB: hotelService.getHotels called');
  // In a real app, this would be:
  // const token = getAuthToken();
  // const response = await fetch(`${API_BASE_URL}/hotels`, { // Assuming an endpoint like /api/hotels
  //   method: 'GET',
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //   },
  // });
  // return handleResponse(response);

  // For now, return mock data:
  return Promise.resolve([
    { id: 1, name: 'Sunset Vista Hotel', address: '123 Ocean Drive' },
    { id: 2, name: 'Mountain Retreat Inn', address: '456 Peak Lane' },
    { id: 3, name: 'City Center Lodge', address: '789 Main Street' },
  ]);
};

// Add other hotel-related functions if needed, e.g., getHotelById(id)

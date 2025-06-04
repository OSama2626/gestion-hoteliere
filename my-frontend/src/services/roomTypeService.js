// STUB for roomTypeService.js
// In a real application, this would fetch data from the backend API.

// Basic API helper functions (these might be in a shared utility file in a real app)
// Duplicated here for now.
const API_BASE_URL = '/api';

const getAuthToken = () => {
  const token = localStorage.getItem('authToken');
  if (!token) console.warn('Auth token not found for roomTypeService (stub).');
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
 * Fetches available room types for a given hotel.
 * @param {string|number} hotelId - The ID of the hotel.
 * @returns {Promise<Array<object>>} A list of room types for the hotel.
 */
export const getRoomTypesForHotel = async (hotelId) => {
  console.log(`STUB: roomTypeService.getRoomTypesForHotel called for hotelId: ${hotelId}`);
  // In a real app, this would be:
  // const token = getAuthToken();
  // const response = await fetch(`${API_BASE_URL}/hotels/${hotelId}/room-types`, { // Assuming an endpoint
  //   method: 'GET',
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //   },
  // });
  // return handleResponse(response);

  // For now, return mock data based on hotelId:
  let roomTypes = [];
  if (parseInt(hotelId, 10) === 1) { // Sunset Vista Hotel
    roomTypes = [
      { id: 101, name: 'Standard Queen', hotel_id: 1, base_price: 150 },
      { id: 102, name: 'Ocean View King', hotel_id: 1, base_price: 250 },
      { id: 103, name: 'Suite', hotel_id: 1, base_price: 400 },
    ];
  } else if (parseInt(hotelId, 10) === 2) { // Mountain Retreat Inn
    roomTypes = [
      { id: 201, name: 'Cabin Standard', hotel_id: 2, base_price: 120 },
      { id: 202, name: 'Cabin Deluxe (Fireplace)', hotel_id: 2, base_price: 180 },
    ];
  } else if (parseInt(hotelId, 10) === 3) { // City Center Lodge
     roomTypes = [
      { id: 301, name: 'Single Business Room', hotel_id: 3, base_price: 100 },
      { id: 302, name: 'Double Standard Room', hotel_id: 3, base_price: 130 },
    ];
  } else {
    roomTypes = [ {id: 999, name: 'Generic Room Type (Test)', hotel_id: hotelId, base_price: 75 } ];
  }
  return Promise.resolve(roomTypes);
};

// Add other room type related functions if needed

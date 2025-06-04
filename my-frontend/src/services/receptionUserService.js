// Basic API helper functions (these might be in a shared utility file in a real app)
const API_BASE_URL = '/api'; // Adjust if your API base URL is different

// Placeholder for authentication token retrieval
// In a real app, this would come from an AuthContext, localStorage, etc.
const getAuthToken = () => {
  // Example: try to get it from localStorage
  const token = localStorage.getItem('authToken');
  // Ensure this aligns with how tokens are actually stored in your frontend
  if (!token) {
    console.warn('Auth token not found. API calls may fail.');
    // Potentially redirect to login or throw an error
  }
  return token;
};

// Basic response handler
// In a real app, this would be more robust, handling various status codes, network errors, etc.
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    const error = new Error(errorData.message || `API Error: ${response.status}`);
    error.response = response; // Attach full response for more context if needed
    error.data = errorData;
    throw error;
  }
  // Handle cases where response might be empty but OK (e.g., 204 No Content)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return response.text(); // Or handle as blob, etc., if needed
};

/**
 * Creates a new client by a reception agent.
 * @param {object} clientData - Data for the new client (firstName, lastName, email, phone?, userType?, companyName?)
 * @returns {Promise<object>} The created client's details.
 */
export const createClientByAgent = async (clientData) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/create-client`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(clientData),
  });
  return handleResponse(response);
};

/**
 * Lists clients, accessible by reception agents.
 * @param {object} filters - Optional filters (e.g., { search: 'name', page: 1, limit: 20 })
 * @returns {Promise<object>} Paginated list of clients.
 */
export const listClientsByAgent = async (filters = {}) => {
  const token = getAuthToken();
  const queryParams = new URLSearchParams(filters).toString();

  const response = await fetch(`${API_BASE_URL}/users?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

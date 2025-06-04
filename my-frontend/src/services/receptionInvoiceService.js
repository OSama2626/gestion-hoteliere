// Basic API helper functions (these might be in a shared utility file in a real app)
// Duplicated here for now. In a real app, import from a shared utils/api.js
const API_BASE_URL = '/api';

const getAuthToken = () => {
  const token = localStorage.getItem('authToken');
  if (!token) console.warn('Auth token not found for receptionInvoiceService.');
  return token;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    // For 501 Not Implemented, we might want to handle it less like an error if expected
    if (response.status === 501) {
        const errorData = await response.json().catch(() => ({ message: "Not Implemented" }));
        // Still throw an error so calling code can be aware, but maybe a specific type
        const error = new Error(errorData.message || "Service not implemented.");
        error.status = 501;
        error.data = errorData;
        throw error;
    }
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
  if (response.status === 204) return null;
  return response.text();
};

/**
 * Generates a new invoice for a reservation if one doesn't exist, or retrieves the existing one.
 * @param {string|number} reservationId - The ID of the reservation.
 * @returns {Promise<object>} The invoice data.
 */
export const generateOrGetInvoice = async (reservationId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/invoice`, {
    method: 'POST', // POST to generate if not exists, or get if exists
    headers: {
      'Authorization': `Bearer ${token}`,
      // No 'Content-Type' needed for an empty body POST, but can be included
    },
  });
  return handleResponse(response);
};

/**
 * Lists invoices with filtering, accessible by reception agents.
 * @param {object} filters - Optional filters (e.g., { clientId, status, dateFrom, dateTo, page, limit })
 * @returns {Promise<object>} Paginated list of invoices.
 */
export const listInvoicesByAgent = async (filters = {}) => {
  const token = getAuthToken();
  const queryParams = new URLSearchParams(filters).toString();

  const response = await fetch(`${API_BASE_URL}/invoices?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

/**
 * Retrieves specific invoice details.
 * Accessible by agents and the client who owns the invoice.
 * @param {string|number} invoiceId - The ID of the invoice.
 * @returns {Promise<object>} The invoice details including items.
 */
export const getInvoiceDetails = async (invoiceId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

/**
 * (Optional) Sends an invoice email. Calls the backend stub.
 * @param {string|number} invoiceId - The ID of the invoice to send.
 * @returns {Promise<object>} Success message from the backend.
 */
export const sendInvoiceEmail = async (invoiceId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleResponse(response);
};

/**
 * (Optional) Returns the URL for downloading an invoice PDF.
 * This points to a backend stub that returns 501 Not Implemented.
 * @param {string|number} invoiceId - The ID of the invoice.
 * @returns {string} The URL to attempt PDF download.
 */
export const downloadInvoicePdfUrl = (invoiceId) => {
  // This doesn't need a token in the URL itself if the /api route is protected by cookies/session for GET,
  // or if the actual download is initiated by a component that can attach headers (less common for direct downloads).
  // For now, just returning the path. The browser will handle the GET request.
  // If token-based auth is strictly needed for GET PDF, this would need an XHR/fetch call that handles the blob.
  return `${API_BASE_URL}/invoices/${invoiceId}/download-pdf`;
};

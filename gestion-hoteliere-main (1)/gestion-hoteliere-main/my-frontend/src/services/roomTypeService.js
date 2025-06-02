// roomTypeService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      // Optionally redirect to login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Get all room types
export const getRoomTypes = async () => {
  try {
    console.log('roomTypeService: Fetching all room types');
    const response = await api.get('/api/room-types');
    console.log('roomTypeService: Room types fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('roomTypeService: Error fetching room types:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch room types';
    throw new Error(errorMessage);
  }
};

// Get room type by ID
export const getRoomTypeById = async (id) => {
  try {
    console.log(`roomTypeService: Fetching room type with ID: ${id}`);
    const response = await api.get(`/api/room-types/${id}`);
    console.log('roomTypeService: Room type fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(`roomTypeService: Error fetching room type ${id}:`, error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch room type';
    throw new Error(errorMessage);
  }
};

// Create new room type (admin function)
export const createRoomType = async (roomTypeData) => {
  try {
    console.log('roomTypeService: Creating new room type:', roomTypeData);
    const response = await api.post('/api/room-types', roomTypeData);
    console.log('roomTypeService: Room type created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('roomTypeService: Error creating room type:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create room type';
    throw new Error(errorMessage);
  }
};

// Update room type (admin function)
export const updateRoomType = async (id, roomTypeData) => {
  try {
    console.log(`roomTypeService: Updating room type ${id}:`, roomTypeData);
    const response = await api.put(`/api/room-types/${id}`, roomTypeData);
    console.log('roomTypeService: Room type updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error(`roomTypeService: Error updating room type ${id}:`, error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to update room type';
    throw new Error(errorMessage);
  }
};

// Delete room type (admin function)
export const deleteRoomType = async (id) => {
  try {
    console.log(`roomTypeService: Deleting room type ${id}`);
    const response = await api.delete(`/api/room-types/${id}`);
    console.log('roomTypeService: Room type deleted successfully');
    return response.data;
  } catch (error) {
    console.error(`roomTypeService: Error deleting room type ${id}:`, error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to delete room type';
    throw new Error(errorMessage);
  }
};

export default {
  getRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType,
};
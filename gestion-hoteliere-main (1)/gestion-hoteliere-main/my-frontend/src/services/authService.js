// Mock API delay
const MOCK_API_DELAY = 1000;

// Mock user database
let mockUsers = []; // This might be kept for other mock functions or removed if all are migrated.

export const getToken = () => {
  return localStorage.getItem('authToken');
};

export const signup = async (userData) => {
  // Ensure the request matches backend expectations: firstName, lastName, email, password (required)
  // phone, userType, companyName are optional
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    userType,
    companyName,
  } = userData;

  // Validate required fields before sending to backend
  if (!firstName || !lastName || !email || !password) {
    throw new Error("All required fields must be filled: first name, last name, email, password.");
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        phone,
        userType,
        companyName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If server responds with an error status, throw an error with the message from the server or validation errors
      // Prefer backend's "error" or "errors" fields if present
      if (data.error) {
        throw new Error(data.error);
      } else if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        // express-validator style: errors: [{msg: "...", param: "..."}]
        throw new Error(data.errors.map(e => `${e.param}: ${e.msg}`).join("; "));
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data; // Expected to be { message, userId } or similar
  } catch (error) {
    console.error('Signup service error:', error);
    throw new Error(error.message || 'An unexpected error occurred during signup.');
  }
};

export const login = async (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers.find(u => u.email === email && u.password === password);
      if (user) {
        const mockToken = 'mock-jwt-token-for-' + user.id; // Use user.id for uniqueness
        resolve({ token: mockToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
      } else {
        reject({ message: 'Invalid credentials' });
      }
    }, MOCK_API_DELAY);
  });
};

export const logout = () => {
  // In a real app, might call a backend endpoint to invalidate token
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('authUser');
  try {
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    return null;
  }
};

export const updateUserProfile = async (userId, profileData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return reject({ message: "User not found" });
      }

      // Update allowed fields
      if (profileData.name !== undefined) {
        mockUsers[userIndex].name = profileData.name;
      }
      if (profileData.password && profileData.password.length > 0) {
        mockUsers[userIndex].password = profileData.password; // In a real app, hash new password
      }

      const updatedUser = mockUsers[userIndex];
      // Return only non-sensitive user data
      resolve({ user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role } });
    }, MOCK_API_DELAY);
  });
};
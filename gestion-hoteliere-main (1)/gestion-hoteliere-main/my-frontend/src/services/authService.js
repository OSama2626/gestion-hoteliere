export const getToken = () => {
  return localStorage.getItem('authToken');
};

export const signup = async (userData) => {
  const { firstName, lastName, email, password, phone, userType, companyName } = userData;
  if (!firstName || !lastName || !email || !password) {
    throw new Error("All required fields must be filled: first name, last name, email, password.");
  }
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password, phone, userType, companyName }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (data.error) throw new Error(data.error);
      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
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
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Invalid credentials');
    }
    // Optionally store user/token here if desired
    return data; // Should contain { token, user }
  } catch (error) {
    throw new Error(error.message || 'An unexpected error occurred during login.');
  }
};

export const logout = () => {
  // Optionally call your backend to invalidate the token here
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
  try {
    const token = getToken();
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(profileData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to update profile');
    }
    return data; // Should return updated user data
  } catch (error) {
    throw new Error(error.message || 'An unexpected error occurred during profile update.');
  }
};
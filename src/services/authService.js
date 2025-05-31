```javascript
// src/services/authService.js
const MOCK_API_DELAY = 1000;

let mockUsers = [
  { id: 'reception-1', email: 'reception@example.com', password: 'password123', name: 'Reception User One', role: 'reception' },
  { id: 'admin-1', email: 'admin@example.com', password: 'password123', name: 'Admin User', role: 'admin' }
]; // Added predefined users

export const signup = async (email, password, name) => { // Added name parameter
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mockUsers.find(user => user.email === email)) {
        reject({ message: 'User already exists' });
      } else {
        const newUser = {
          id: Date.now().toString(),
          email,
          password, // In a real app, this would be hashed
          name: name || email.split('@')[0], // Default name from email part
          role: 'user' // Explicitly set role to 'user' for new sign-ups
        };
        mockUsers.push(newUser);
        console.log('Mock Users after signup:', mockUsers);
        const mockToken = 'mock-jwt-token-for-' + newUser.id; // Use newUser.id for uniqueness
        resolve({ token: mockToken, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role } });
      }
    }, MOCK_API_DELAY);
  });
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
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  try {
    const parsedUser = user ? JSON.parse(user) : null;
    console.log('getCurrentUser from localStorage:', parsedUser); // Added for debugging
    return parsedUser;
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
```

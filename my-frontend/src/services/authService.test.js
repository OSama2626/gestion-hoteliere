import { signup } from './authService'; // Assuming signup is a named export

describe('authService - signup', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch; // Store original fetch
    global.fetch = jest.fn(); // Mock fetch
  });

  afterEach(() => {
    global.fetch = originalFetch; // Restore original fetch
  });

  const mockUserData = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890',
    userType: 'individual',
  };

  const mockCompanyUserData = {
    ...mockUserData,
    userType: 'company',
    companyName: 'Test Inc.',
  };

  const mockSuccessResponse = {
    token: 'mock-token',
    user: { id: '1', email: mockUserData.email, name: `${mockUserData.firstName} ${mockUserData.lastName}` },
  };

  test('should make a POST request to /api/auth/register with correct user data and return response on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResponse,
    });

    const result = await signup(mockUserData);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockUserData),
    });
    expect(result).toEqual(mockSuccessResponse);
  });

  test('should send companyName when userType is company', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockSuccessResponse, user: { ...mockSuccessResponse.user, companyName: mockCompanyUserData.companyName } }),
    });

    await signup(mockCompanyUserData);

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
      body: JSON.stringify(mockCompanyUserData),
    }));
  });

  test('should throw an error if the API call is not ok (e.g., 400, 409)', async () => {
    const mockErrorResponse = { message: 'User already exists' };
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => mockErrorResponse,
    });

    await expect(signup(mockUserData)).rejects.toThrow(mockErrorResponse.message);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('should throw a generic error if API response is not ok and no message in body', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}), // Empty JSON or non-standard error
    });

    await expect(signup(mockUserData)).rejects.toThrow('HTTP error! status: 500');
  });

  test('should throw an error if fetch fails (e.g., network error)', async () => {
    const networkError = new Error('Network failed');
    global.fetch.mockRejectedValueOnce(networkError);

    await expect(signup(mockUserData)).rejects.toThrow('Network failed');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('should throw an error with server message if response is not ok and response.json() fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error("Failed to parse JSON") }, // Simulate JSON parsing error
    });

    // The service should catch this and throw its own error, potentially with status
    await expect(signup(mockUserData)).rejects.toThrow('HTTP error! status: 500');
  });
});

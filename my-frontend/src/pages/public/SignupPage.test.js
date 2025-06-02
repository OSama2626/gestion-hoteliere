import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignupPage from './SignupPage';
import { AuthContext } from '../../store/contexts/AuthContext';
import * as authService from '../../services/authService';

// Mock the authService, specifically the signup function
jest.mock('../../services/authService', () => ({
  signup: jest.fn(),
}));

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // import and retain default behavior
  useNavigate: () => mockedNavigate,
}));

const mockAuthProvider = ({ children, authUser = null, signupFn = jest.fn() }) => (
  <AuthContext.Provider value={{ user: authUser, signup: signupFn, login: jest.fn(), logout: jest.fn() }}>
    {children}
  </AuthContext.Provider>
);

describe('SignupPage', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockedNavigate.mockClear();
    authService.signup.mockClear();
    // Reset signup mock to a resolved promise by default to avoid unhandled promise rejections
    // if a test triggers form submission.
    authService.signup.mockResolvedValue({ token: 'test-token', user: { id: '1', name: 'Test User', role: 'user' } });
  });

  test('renders all new input fields (firstName, lastName, phone, userType)', () => {
    render(
      <MemoryRouter>
        <mockAuthProvider>
          <SignupPage />
        </mockAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/user type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument(); // Existing field
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument(); // Existing field
  });

  test('companyName input field is initially not visible', () => {
    render(
      <MemoryRouter>
        <mockAuthProvider>
          <SignupPage />
        </mockAuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument();
  });

  test('companyName input field becomes visible when userType is changed to "company"', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <mockAuthProvider>
          <SignupPage />
        </mockAuthProvider>
      </MemoryRouter>
    );

    const userTypeSelect = screen.getByLabelText(/user type/i);
    await user.selectOptions(userTypeSelect, 'company');

    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
  });

  test('companyName input field is hidden again when userType is changed back to "individual"', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <mockAuthProvider>
          <SignupPage />
        </mockAuthProvider>
      </MemoryRouter>
    );

    const userTypeSelect = screen.getByLabelText(/user type/i);

    // Change to 'company'
    await user.selectOptions(userTypeSelect, 'company');
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();

    // Change back to 'individual'
    await user.selectOptions(userTypeSelect, 'individual');
    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument();
  });

  test('does not show companyName input if userType is not company', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <mockAuthProvider>
          <SignupPage />
        </mockAuthProvider>
      </MemoryRouter>
    );
    const userTypeSelect = screen.getByLabelText(/user type/i);
    // Ensure it's individual
    await user.selectOptions(userTypeSelect, 'individual');
    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument();
  });

});

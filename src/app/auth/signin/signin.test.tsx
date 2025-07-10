import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignInPage from './page'; // The component to test
import { AuthProvider } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebaseConfig'; // For creating test users
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Toaster } from '@/components/ui/toaster'; // Required by useToast

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(), // Mock the push function
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
}));

// Mock useToast from '@/hooks/use-toast'
// If your actual useToast is more complex, this mock might need to be adjusted
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(), // Mock the toast function
  }),
}));


describe('SignInPage', () => {
  const testEmail = `signinpage-${Date.now()}@example.com`;
  const testPassword = 'password123';

  beforeAll(async () => {
    // Create a user in the emulator to test sign-in against
    try {
      await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      await signOut(auth); // Ensure user is signed out before tests
    } catch (error) {
      console.error('Failed to create test user for SignInPage:', error);
      // Decide if tests should fail if user creation fails. For now, log and continue.
    }
  });

  afterEach(async () => {
    if (auth.currentUser) {
      await signOut(auth);
    }
  });

  test('renders sign-in form', async () => {
    render(
      <AuthProvider>
        <SignInPage />
        <Toaster />
      </AuthProvider>
    );
    // Wait for initial auth loading to complete if any
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('allows user to sign in successfully', async () => {
    const { push } = require('next/navigation').useRouter(); // Get the mocked push

    render(
      <AuthProvider>
        <SignInPage />
        <Toaster />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: testEmail } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: testPassword } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    // Wait for successful sign-in (e.g., router push or user state change in a more complex setup)
    // In SignInPage, it calls router.push('/') on success.
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'), { timeout: 10000 });

    // Also, check if the toast was called (optional, depends on requirements)
    const { toast } = require('@/hooks/use-toast').useToast();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Signed In!" }));

    // Verify user is actually set in context (optional, AuthContext tests cover this more directly)
    // This would require exposing currentUser from AuthProvider in a testable way here or
    // having another component that displays currentUser state.
  });

  test('shows error message for invalid credentials', async () => {
    render(
      <AuthProvider>
        <SignInPage />
        <Toaster />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    await waitFor(() => {
      // Check for the error message displayed in the form
      // The exact message depends on the error handling in SignInPage
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    }, { timeout: 5000 });

    const { toast } = require('@/hooks/use-toast').useToast();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sign In Failed", variant: "destructive" }));
  });
});

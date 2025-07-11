import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignUpPage from './page'; // The component to test
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebaseConfig'; // Direct import for test utilities
import { signOut, deleteUser } from 'firebase/auth';
import { Toaster } from '@/components/ui/toaster';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
}));

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Helper to generate unique emails for test users
const getUniqueEmail = () => `testsignup-${Date.now()}@example.com`;

describe('SignUpPage', () => {

  afterEach(async () => {
    // Clean up any authenticated user
    if (auth.currentUser) {
      try {
        // To delete a user, they typically need to be re-authenticated or use Admin SDK.
        // For client-side tests, this is tricky. We'll sign out and rely on unique emails for isolation.
        // If a user was created, deleteUser will only work if that user is current and recently authenticated.
        // This cleanup is best-effort for client-side. Full cleanup is better with Admin SDK or emulator reset.
        const userToDelete = auth.currentUser;
        await signOut(auth); // Sign out first to ensure no active session interferes
        // Attempt to delete if possible - this might fail if re-authentication is needed by Firebase rules
        // For robust tests, prefer unique emails or full emulator resets between test suites.
        // await deleteUser(userToDelete); // This line is problematic without re-auth.
      } catch (e) {
        // console.warn("Could not delete test user during cleanup", e);
      }
    }
  });

  test('renders sign-up form', async () => {
    render(
      <AuthProvider>
        <SignUpPage />
        <Toaster />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument(); // Exact match for "Password"
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('allows user to sign up successfully', async () => {
    const { push } = require('next/navigation').useRouter();
    const { toast } = require('@/hooks/use-toast').useToast();
    const testEmail = getUniqueEmail();

    render(
      <AuthProvider>
        <SignUpPage />
        <Toaster />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: testEmail } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'), { timeout: 10000 });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Account Created!" }));

    // Verify user is actually set in context by checking auth state directly (optional)
    // This requires a brief moment for onAuthStateChanged to propagate
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for auth state
    expect(auth.currentUser).not.toBeNull();
    expect(auth.currentUser?.email).toBe(testEmail);
    // Cleanup the created user
    if (auth.currentUser) await deleteUser(auth.currentUser);
  });

  test('shows error if passwords do not match', async () => {
    const { toast } = require('@/hooks/use-toast').useToast();
    render(
      <AuthProvider>
        <SignUpPage />
        <Toaster />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: getUniqueEmail() } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password456' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sign Up Failed", description: "Passwords do not match."}));
  });

  test('shows error for existing email from AuthContext/Firebase', async () => {
    const existingEmail = getUniqueEmail();
    const { toast } = require('@/hooks/use-toast').useToast();

    // Create user first to make it existing
    const tempAuth = getAuth(initializeApp(firebaseConfig, `signup-pre-auth-${Date.now()}`));
    // Ensure FIREBASE_AUTH_EMULATOR_HOST is set for this instance too if not globally for Jest
    const tempUserCred = await createUserWithEmailAndPassword(tempAuth, existingEmail, 'password123');
    await signOut(tempAuth); // Sign out this temp user

    render(
      <AuthProvider> {/* This AuthProvider will use the main 'auth' instance */}
        <SignUpPage />
        <Toaster />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: existingEmail } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'newPass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'newPass123' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('This email address is already in use.')).toBeInTheDocument();
    });
     expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sign Up Failed", description: 'This email address is already in use.'}));

    // Clean up the pre-created user
    // Need to sign them in to delete them via client SDK
    try {
        await signInWithEmailAndPassword(tempAuth, existingEmail, 'password123');
        if (tempAuth.currentUser) await deleteUser(tempAuth.currentUser);
    } catch(e) {
        console.warn("Could not clean up pre-created user for existing email test:", e);
    }
    await deleteApp(tempAuth.app); // Delete the temporary app instance
  });
});

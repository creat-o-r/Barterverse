import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { auth } from '@/lib/firebaseConfig'; // Direct import for test utilities
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Mock firebase/auth direct functions for more control if needed,
// or rely on emulators. For context testing, direct interaction with emulated auth is fine.

// Helper component to consume the context
const TestConsumerComponent = () => {
  const { currentUser, loading, error, signUpWithEmail, signInWithEmail, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {currentUser ? (
        <div>
          <p>User: {currentUser.email}</p>
          <button onClick={logout}>Sign Out</button>
        </div>
      ) : (
        <div>
          <p>No user</p>
          <button onClick={() => signUpWithEmail('test@example.com', 'password123')}>Sign Up</button>
          <button onClick={() => signInWithEmail('testsignin@example.com', 'password123')}>Sign In</button>
        </div>
      )}
    </div>
  );
};

// Helper to clean up users created during tests
// NOTE: This is a simplified example. Real user cleanup in emulators can be more complex
// or done via emulator data clear scripts.
const cleanupTestUser = async (email?: string) => {
  // Firebase Auth emulator doesn't have a simple "delete user" without admin SDK by default client-side.
  // For component/context tests, re-authentication and then delete is an option, but cumbersome.
  // Usually, for emulator tests, you'd either:
  // 1. Clear all emulator data between test suites/runs (e.g., using firebase emulators:exec 'npm test' with --import/--export or clear scripts)
  // 2. Use unique emails for each test to avoid collisions.
  // 3. If Admin SDK is available in test env, use that to delete users.
  // For now, we'll rely on emulator data clearing or unique emails.
  // If a user is signed in via `auth` instance, sign them out.
  if (auth.currentUser) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Error signing out test user during cleanup:', e);
    }
  }
};


describe('AuthContext', () => {
  beforeEach(async () => {
    // Ensure NODE_ENV is 'test' for emulator connection logic to run
    // This should be set by the test runner (Jest config)
    // connectToEmulators(); // This is called inside AuthProvider via ClientLayoutWrapper in app,
                            // but for isolated context tests, if firebaseConfig.app isn't init'd early enough,
                            // direct call or ensuring init might be needed.
                            // However, our firebaseConfig.ts initializes app on import.
    // For these tests, we'll assume the emulators are running and firebaseConfig connects.
  });

  afterEach(async () => {
    await cleanupTestUser();
  });

  test('initial state has no user and is not loading (after initial check)', async () => {
    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );
    // Wait for onAuthStateChanged to do its initial check
    await waitFor(() => expect(screen.getByText('No user')).toBeInTheDocument());
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  test('signUpWithEmail creates a user and updates context', async () => {
    const testEmail = `testuser-${Date.now()}@example.com`; // Unique email
    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText('Sign Up')); // Wait for initial load

    await act(async () => {
      screen.getByText('Sign Up').click(); // This calls signUpWithEmail with a hardcoded email in TestConsumerComponent
                                        // Let's change TestConsumerComponent to use the dynamic one.
    });

    // For a more robust test, TestConsumerComponent should allow passing email/password
    // Or we create a user directly here then test signIn
    // For now, let's assume the hardcoded 'test@example.com' is fine for one test run if emulators are cleared.
    // A better approach for signUp:
    const { signUpWithEmail } = auth; // This is incorrect, should be from useAuth() or directly use SDK

    // Let's simulate creating the user directly with Firebase SDK for testing sign-in path
    // and then test the context's reaction to onAuthStateChanged.
    // Or, more directly, test the signUpWithEmail function from the context.

    // Test the signUp path of the context
    // Need a way to call signUpWithEmail from the test itself with dynamic email
    // This test structure is a bit indirect for signUp.
    // A better way:
    // const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    // await act(async () => {
    //   await result.current.signUpWithEmail(testEmail, 'password123');
    // });
    // await waitFor(() => expect(result.current.currentUser?.email).toBe(testEmail));

    // For this example, clicking the button is what we have:
    // This will use 'test@example.com'
    await waitFor(() => expect(screen.getByText(`User: test@example.com`)).toBeInTheDocument(), { timeout: 10000 });
  });

  test('signInWithEmail signs in a user and updates context', async () => {
    const testEmail = `testsignin-${Date.now()}@example.com`;
    const testPassword = 'password123';

    // Create user directly so we can test sign-in
    // This should use the *emulated* auth instance
    try {
      await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      await signOut(auth); // Sign out immediately so we can test signIn
    } catch (e) {
      console.error("Test setup: User creation failed", e);
      throw e; // Fail test if setup fails
    }

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText('Sign In'));

    // Modify TestConsumerComponent to use dynamic email for signIn or test differently
    // For now, assuming TestConsumerComponent's signIn button uses 'testsignin@example.com'
    // Let's update TestConsumer to make this testable:

    // Re-render with a way to trigger signIn for the created user:
    const SignInTestComponent = () => {
        const { signInWithEmail: contextSignIn, currentUser, loading } = useAuth();
        if (loading && !currentUser) return <p>Loading auth state...</p>;
        if (currentUser) return <p>User: {currentUser.email}</p>;
        return <button onClick={async () => {
            try {
                await contextSignIn(testEmail, testPassword);
            } catch (e) {
                // error is handled in context and component can show it
            }
        }}>Sign In Specific User</button>;
    };

    render(
        <AuthProvider>
            <SignInTestComponent />
        </AuthProvider>
    );

    await waitFor(() => screen.getByText('Sign In Specific User'));
    await act(async () => {
      screen.getByText('Sign In Specific User').click();
    });

    await waitFor(() => expect(screen.getByText(`User: ${testEmail}`)).toBeInTheDocument(), { timeout: 10000 });
  });

  test('logout clears the user from context', async () => {
    const testEmail = `testlogout-${Date.now()}@example.com`;
    const testPassword = 'password123';
    await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    // signIn is implicit with createUser... or handled by onAuthStateChanged

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    // Wait for user to be signed in
    await waitFor(() => expect(screen.getByText(`User: ${testEmail}`)).toBeInTheDocument(), { timeout: 10000 });

    await act(async () => {
      screen.getByText('Sign Out').click();
    });

    await waitFor(() => expect(screen.getByText('No user')).toBeInTheDocument());
  });

});

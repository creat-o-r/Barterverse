import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Navbar from './Navbar';
import { AuthProvider } from '@/contexts/AuthContext';
import { useGlobalFilter as mockUseGlobalFilter } from '@/contexts/GlobalFilterContext';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, clearFirestoreData, terminate } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebaseConfig';
import { Toaster } from '@/components/ui/toaster'; // For useToast mock

// --- Firebase Test Setup ---
let testApp: any;
let testAuth: any;
let testDb: any;
const PROJECT_ID = firebaseConfig.projectId;
const getUniqueEmail = () => `navbar-test-${Date.now()}@example.com`;

// --- Mocks ---
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: any }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@/contexts/GlobalFilterContext', () => ({
  useGlobalFilter: jest.fn(),
}));

// Mock next/navigation for router.push in logout
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));


const mockSetSelectedCategory = jest.fn();
const unreadCountInNavbar = 3; // Based on Navbar's current placeholder

// Helper to render Navbar with AuthProvider and other necessary providers
const renderNavbar = () => {
  return render(
    <AuthProvider>
      <Navbar />
      <Toaster /> {/* Toaster is used by useToast hook which is used in Navbar's logout */}
    </AuthProvider>
  );
};


describe('Navbar Component', () => {
  beforeAll(async () => {
    testApp = initializeApp(firebaseConfig, `navbar-test-app-${Date.now()}`);
    testAuth = getAuth(testApp);
    testDb = getFirestore(testApp); // Though not directly used by Navbar, good practice for consistency
    try {
      connectFirestoreEmulator(testDb, 'localhost', 8080);
      // Auth emulator connection relies on FIREBASE_AUTH_EMULATOR_HOST env var
    } catch (e) { /* console.warn('NavbarTest: Emulator connection error', e); */ }
  });

  afterAll(async () => {
    if (testDb) await terminate(testDb);
    if (testApp) await deleteApp(testApp);
  });

  beforeEach(async () => {
    // Clear Firestore (though Navbar doesn't directly use it, future versions might for profile names etc.)
    try { await clearFirestoreData({ projectId: PROJECT_ID }); } catch (e) { /* console.error('NavbarTest: Firestore clear error', e); */ }

    // Sign out any current user from testAuth instance
    if (testAuth.currentUser) {
      await signOut(testAuth);
    }
    // Reset mocks
    (mockUseGlobalFilter as jest.Mock).mockReturnValue({
      selectedCategory: null,
      setSelectedCategory: mockSetSelectedCategory,
      availableCategories: ['Electronics', 'Books', 'Clothing'],
    });
    mockSetSelectedCategory.mockClear();
    require('next/navigation').useRouter().push.mockClear();
    require('@/hooks/use-toast').useToast().toast.mockClear();
  });

  describe('Common Elements', () => {
    test('renders GlobalCategoryFilter', async () => {
      renderNavbar();
      // Wait for auth loading to complete (Navbar shows Loader2 initially)
      await screen.findByRole('combobox'); // GlobalCategoryFilter's SelectTrigger
      const selectTriggers = screen.getAllByRole('combobox');
      expect(selectTriggers.length).toBeGreaterThan(0);
    });
  });

  describe('Logged Out State', () => {
    test('renders Login and Sign Up buttons, no Profile or Sign Out', async () => {
      renderNavbar();
      await waitFor(() => { // Wait for auth state to settle (no user)
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Desktop assertions
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /profile/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
      // Mobile assertions (icon links)
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument(); // Aria-label for mobile
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument(); // Aria-label for mobile
    });

    test('does not render authenticated links (List Item, Chats)', async () => {
      renderNavbar();
      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      expect(screen.queryByRole('link', { name: /list item/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /chats/i })).not.toBeInTheDocument();
    });
  });

  describe('Logged In State', () => {
    let testUser: any; // Firebase User type

    beforeEach(async () => {
      // Create and sign in a test user for these tests
      const email = getUniqueEmail();
      const password = 'password123';
      try {
        const cred = await createUserWithEmailAndPassword(testAuth, email, password);
        testUser = cred.user;
        // Note: AuthProvider will pick up this user via onAuthStateChanged on the main `auth` instance
        // We need to ensure the testAuth instance and main `auth` instance are using the same emulator
        // This is typically handled by FIREBASE_AUTH_EMULATOR_HOST.
        // Forcing a re-render or waiting might be needed if state propagation is slow.
      } catch (e) {
        console.error("Failed to create test user for Navbar logged-in state tests:", e);
        throw e; // Fail tests if user creation fails
      }
    });

    afterEach(async () => {
      if (testUser && testAuth.currentUser && testAuth.currentUser.uid === testUser.uid) {
        await deleteUser(testUser); // Requires re-authentication or admin SDK. For now, rely on unique emails and signout.
      }
      testUser = null;
      if (testAuth.currentUser) {
        await signOut(testAuth); // Ensure sign out after each test
      }
    });

    test('renders Profile link, user email, and Sign Out button; no Login/Sign Up', async () => {
      renderNavbar();
      // Wait for auth state to propagate and Navbar to re-render with user
      await waitFor(() => expect(screen.getByText(testUser.email)).toBeInTheDocument(), {timeout: 5000});

      expect(screen.queryByRole('link', { name: /login/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();

      const profileLinks = screen.getAllByRole('link', { name: /profile/i });
      expect(profileLinks.length).toBeGreaterThan(0); // Mobile and Desktop
      expect(profileLinks[0]).toHaveAttribute('href', '/profile/me');

      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    test('renders authenticated links (List Item, Chats)', async () => {
      renderNavbar();
      await waitFor(() => expect(screen.getByText(testUser.email)).toBeInTheDocument());

      // Desktop nav is the second <nav>
      const navElements = screen.getAllByRole('navigation');
      const desktopNav = navElements.length > 1 ? navElements[1] : navElements[0]; // Fallback if only one nav

      expect(within(desktopNav).getByRole('link', { name: /list item/i })).toBeInTheDocument();
      expect(within(desktopNav).getByRole('link', { name: /chats/i })).toBeInTheDocument();
    });

    test('Sign Out button logs out user and redirects', async () => {
      const { push } = require('next/navigation').useRouter();
      const { toast } = require('@/hooks/use-toast').useToast();
      renderNavbar();
      await waitFor(() => expect(screen.getByText(testUser.email)).toBeInTheDocument());

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Signed Out" }));
      // After logout, Login/Sign Up buttons should reappear
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    });
  });


  // Test for unreadCount remains conceptual as it's hardcoded in Navbar
  test('Chats link shows "9+" if unreadCount is high (conceptual test)', () => {
    if (unreadCountInNavbar <= 9) {
      // console.warn("Skipping '9+' badge test as hardcodedUnreadCount is not > 9.");
      return;
    }
    // This test would require Navbar to take unreadCount as a prop or from a context
    // For now, it will fail or be skipped based on the hardcoded value.
  });
});

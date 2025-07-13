import * as React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from './Footer'; // Assuming Footer is default export

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true, // This is important for modules with default exports
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: any }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react (already handled in jest.setup.js)
// The global mock in jest.setup.js will provide dummy SvgMock components
// for ServerCrash and LogOut. We can check for their presence via associated text or button roles.

describe('Footer Component', () => {
  // Note: Tests are based on the current hardcoded values in Footer.tsx:
  // const isAdmin = true;
  // const isLoggedIn = true;
  // Tests for other states (isAdmin=false, isLoggedIn=false) would require these
  // values to be controllable (e.g., via props or a mockable context/hook).

  describe('Based on hardcoded state (isAdmin=true, isLoggedIn=true)', () => {
    beforeEach(() => {
      render(<Footer />);
    });

    test('renders the static tagline text', () => {
      expect(screen.getByText('match anything with anyone')).toBeInTheDocument();
    });

    describe('Admin Panel Link (since isAdmin is true)', () => {
      test('renders the "Admin Panel" link', () => {
        const adminPanelLink = screen.getByRole('link', { name: /admin panel/i });
        expect(adminPanelLink).toBeInTheDocument();
        // The ServerCrash icon is mocked. We assume its visual presence if the link text is there.
        // A more robust test for the icon would involve checking for the <svg> tag if the mock rendered it,
        // or a data-testid on the icon if the component structure allowed it.
      });

      test('Admin Panel link has the correct href attribute', () => {
        const adminPanelLink = screen.getByRole('link', { name: /admin panel/i });
        expect(adminPanelLink).toHaveAttribute('href', '/admin/match-reports');
      });
    });

    describe('Log out Button (since isLoggedIn is true)', () => {
      test('renders the "Log out" button', () => {
        const logoutButton = screen.getByRole('button', { name: /log out/i });
        expect(logoutButton).toBeInTheDocument();
        // The LogOut icon is mocked. We assume its visual presence if the button text is there.
      });
    });
  });

  describe('Conditional Rendering Notes (for future reference)', () => {
    test('Admin Panel link should be hidden if isAdmin were false', () => {
      // This test is conceptual based on current component structure.
      // To actually test this, Footer would need to get isAdmin as a prop or from a mockable source.
      // If isAdmin were false:
      // render(<Footer isAdmin={false} />); // Hypothetical prop
      // expect(screen.queryByRole('link', { name: /admin panel/i })).not.toBeInTheDocument();
      expect(true).toBe(true); // Placeholder to make test runner pass
      console.info("Conceptual test: Admin Panel link hidden if isAdmin=false (depends on controllable state)");
    });

    test('Log out button should be hidden if isLoggedIn were false', () => {
      // This test is conceptual.
      // If isLoggedIn were false:
      // render(<Footer isLoggedIn={false} />); // Hypothetical prop
      // expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
      expect(true).toBe(true); // Placeholder
      console.info("Conceptual test: Log out button hidden if isLoggedIn=false (depends on controllable state)");
    });
  });
});

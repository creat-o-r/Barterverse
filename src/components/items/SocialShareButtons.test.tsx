import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialShareButtons, { LOCAL_STORAGE_KEY, DEFAULT_PRIMARY_PLATFORM_IDS, NUM_PRIMARY_BUTTONS } from './SocialShareButtons'; // Import constants

// --- Mock localStorage ---
let store: { [key: string]: string } = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value.toString();
  }),
  clear: jest.fn(() => {
    store = {};
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
  }),
  length: 0, // Not dynamically updated in this mock, but usually not critical for these tests
  key: jest.fn((index: number) => Object.keys(store)[index] || null), // Basic key mock
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// --- Mock window.open ---
global.open = jest.fn();

// --- Mock navigator.clipboard ---
const mockClipboardWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockClipboardWriteText },
  writable: true,
});


describe('SocialShareButtons', () => {
  const itemName = 'Test Item';
  const itemUrl = 'https://example.com/item/123';
  const itemImageUrl = 'https://example.com/image.jpg'; // For Pinterest with image
  const encodedItemName = encodeURIComponent(itemName);
  const encodedItemUrl = encodeURIComponent(itemUrl);

  // Define platform IDs for easier reference, matching those in the component
  const platformIds = {
    facebook: 'facebook',
    twitter: 'twitter',
    whatsapp: 'whatsapp',
    linkedin: 'linkedin',
    pinterest: 'pinterest',
    reddit: 'reddit',
    telegram: 'telegram',
    email: 'email',
    signal: 'signal',
    copyLink: 'copyLink',
  };


  beforeEach(() => {
    (global.open as jest.Mock).mockClear();
    mockClipboardWriteText.mockClear();
    localStorageMock.clear(); // Clear localStorage store
    localStorageMock.getItem.mockClear(); // Clear mock function calls
    localStorageMock.setItem.mockClear();
    jest.useRealTimers(); // Default to real timers
  });

  const getPlatformButton = (label: string) => screen.queryByRole('button', { name: label });
  const getAllPrimaryButtons = () => {
      const shareText = screen.getByText('Share:').parentElement;
      return Array.from(shareText?.querySelectorAll('button[aria-label]:not([aria-label*="Show more"]):not([aria-label*="Show less"])') || []);
  };
   const getAllSecondaryButtons = () => {
      const showMoreContainer = screen.getByLabelText(/Show (more|less) sharing options/)?.closest('div')?.nextElementSibling;
      if (!showMoreContainer) return [];
      return Array.from(showMoreContainer.querySelectorAll('button[aria-label]'));
  };


  describe('Default Behavior (No localStorage Data or Zero Counts)', () => {
    it('renders default primary platforms and others in secondary', () => {
      render(<SocialShareButtons itemName={itemName} itemUrl={itemUrl} />);

      const primaryButtons = getAllPrimaryButtons();
      expect(primaryButtons.length).toBe(NUM_PRIMARY_BUTTONS);

      // Check if default platforms are primary, in order
      expect(primaryButtons[0].getAttribute('aria-label')).toBe(`Share on ${DEFAULT_PRIMARY_PLATFORM_IDS[0].charAt(0).toUpperCase() + DEFAULT_PRIMARY_PLATFORM_IDS[0].slice(1)}`);
      expect(primaryButtons[1].getAttribute('aria-label')).toBe(`Share on ${DEFAULT_PRIMARY_PLATFORM_IDS[1].charAt(0).toUpperCase() + DEFAULT_PRIMARY_PLATFORM_IDS[1].slice(1)}`);
      // WhatsApp is the third default
      expect(primaryButtons[2].getAttribute('aria-label')).toBe('Share on WhatsApp');


      // Check if a known non-default (like LinkedIn) is not primary
      const linkedInButtonPrimary = primaryButtons.find(btn => btn.getAttribute('aria-label') === 'Share on LinkedIn');
      expect(linkedInButtonPrimary).toBeUndefined();

      // Click "Show More" to check secondary
      const showMoreButton = screen.getByLabelText('Show more sharing options');
      expect(showMoreButton).toBeInTheDocument(); // It should exist if there are secondary items
      fireEvent.click(showMoreButton);

      expect(getPlatformButton('Share on LinkedIn')).toBeVisible();
      expect(getPlatformButton('Copy item link')).toBeVisible(); // Copy link should be secondary by default
    });
  });

  describe('Usage Tracking and localStorage Interaction', () => {
    it('increments usage count and saves to localStorage on button click', async () => {
      render(<SocialShareButtons itemName={itemName} itemUrl={itemUrl} />);

      const facebookButton = getPlatformButton('Share on Facebook');
      expect(facebookButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(facebookButton!);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const expectedCounts = { [platformIds.facebook]: 1 };
      expect(localStorageMock.setItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY, JSON.stringify(expectedCounts));

      // Simulate another click
      const twitterButton = getPlatformButton('Share on Twitter');
      expect(twitterButton).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(twitterButton!);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2); // Called again
      const updatedCounts = { [platformIds.facebook]: 1, [platformIds.twitter]: 1 };
      expect(localStorageMock.setItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY, JSON.stringify(updatedCounts));
    });
  });

  describe('Dynamic Primary Button Selection', () => {
    it('renders most used platforms as primary', () => {
      const usageCounts = {
        [platformIds.linkedin]: 10,
        [platformIds.pinterest]: 8,
        [platformIds.reddit]: 12,
        [platformIds.email]: 5, // Should be secondary
      };
      localStorageMock.setItem(LOCAL_STORAGE_KEY, JSON.stringify(usageCounts));

      render(<SocialShareButtons itemName={itemName} itemUrl={itemUrl} />);

      const primaryButtons = getAllPrimaryButtons();
      expect(primaryButtons.length).toBe(NUM_PRIMARY_BUTTONS);
      expect(primaryButtons[0].getAttribute('aria-label')).toBe('Share on Reddit'); // 12 uses
      expect(primaryButtons[1].getAttribute('aria-label')).toBe('Share on LinkedIn'); // 10 uses
      expect(primaryButtons[2].getAttribute('aria-label')).toBe('Share on Pinterest'); // 8 uses

      fireEvent.click(screen.getByLabelText('Show more sharing options'));
      expect(getPlatformButton('Share via Email')).toBeVisible(); // 5 uses, should be secondary
    });

    it('breaks ties alphabetically for primary selection', () => {
        const usageCounts = {
            [platformIds.signal]: 10, // Signal before Telegram alphabetically
            [platformIds.telegram]: 10,
            [platformIds.facebook]: 10, // Facebook before Signal
            [platformIds.email]: 5,
        };
        localStorageMock.setItem(LOCAL_STORAGE_KEY, JSON.stringify(usageCounts));
        render(<SocialShareButtons itemName={itemName} itemUrl={itemUrl} />);
        const primaryButtons = getAllPrimaryButtons();
        expect(primaryButtons[0].getAttribute('aria-label')).toBe('Share on Facebook');
        expect(primaryButtons[1].getAttribute('aria-label')).toBe('Share on Signal');
        expect(primaryButtons[2].getAttribute('aria-label')).toBe('Share on Telegram');
    });
  });

  describe('Copy Link Button Placement and Functionality', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('appears in secondary by default and handles copy', async () => {
      render(<SocialShareButtons itemName={itemName} itemUrl={itemUrl} />);
      const showMoreButton = screen.getByLabelText('Show more sharing options');
      fireEvent.click(showMoreButton);

      const copyButton = getPlatformButton('Copy item link');
      expect(copyButton).toBeVisible();

      mockClipboardWriteText.mockResolvedValueOnce(undefined);
      await act(async () => {
        fireEvent.click(copyButton!);
        await mockClipboardWriteText(); // Ensure promise resolves
      });

      expect(mockClipboardWriteText).toHaveBeenCalledWith(itemUrl);
      expect(screen.getByLabelText('Link Copied!')).toBeInTheDocument();

      await act(async () => { jest.advanceTimersByTime(2500); });
      expect(screen.getByLabelText('Copy item link')).toBeInTheDocument();
    });

    it('can become primary if highly used', () => {
        const usageCounts = { [platformIds.copyLink]: 20, [platformIds.facebook]: 1, [platformIds.twitter]: 1 };
        localStorageMock.setItem(LOCAL_STORAGE_KEY, JSON.stringify(usageCounts));
        render(<SocialShareButtons itemName={itemName} itemUrl={itemUrl} />);
        const primaryButtons = getAllPrimaryButtons();
        expect(primaryButtons[0].getAttribute('aria-label')).toBe('Copy item link');
    });
  });

  describe('"Show More" Button Visibility', () => {
    it('is visible when there are secondary platforms', () => {
      const fewItemsUsage = { [platformIds.facebook]: 3, [platformIds.twitter]: 2, [platformIds.whatsapp]: 1 };
      // Other platforms will have 0, ensuring many secondary items.
      localStorageMock.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fewItemsUsage));
      render(<SocialShareButtons itemName={itemName} itemUrl={itemUrl} />);
      expect(screen.queryByLabelText(/Show more sharing options/)).toBeInTheDocument();
    });
  });

  // Re-add basic click tests, ensuring they are found (primary or secondary)
  describe('Individual Platform Actions (generic)', () => {
    it('opens Facebook link correctly', async () => {
      render(<SocialShareButtons itemName={itemName} itemUrl={itemUrl} />);
      // Facebook is default primary.
      // Ensure it's found using a more specific query if needed, or rely on default placement.
      const facebookButton = screen.getByRole('button', {name: 'Share on Facebook'});
      await act(async () => { fireEvent.click(facebookButton); });
      expect(global.open).toHaveBeenCalledWith(expect.stringContaining('facebook.com'), '_blank', 'noopener,noreferrer');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY, JSON.stringify({ [platformIds.facebook]: 1 }));
    });

    it('opens LinkedIn link (secondary) correctly', async () => {
      render(<SocialShareButtons itemName={itemName} itemUrl={itemUrl} />);
      fireEvent.click(screen.getByLabelText('Show more sharing options')); // Open secondary
      const linkedInButton = screen.getByRole('button', {name: 'Share on LinkedIn'});
      await act(async () => { fireEvent.click(linkedInButton); });
      expect(global.open).toHaveBeenCalledWith(expect.stringContaining('linkedin.com'), '_blank', 'noopener,noreferrer');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY, JSON.stringify({ [platformIds.linkedin]: 1 }));
    });
  });
});

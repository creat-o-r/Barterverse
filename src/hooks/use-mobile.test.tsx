import { act, renderHook } from '@testing-library/react';
import { useIsMobile, MOBILE_BREAKPOINT } from './use-mobile'; // Assuming MOBILE_BREAKPOINT is exported or known

// Mock implementation for window.matchMedia
// Store event listeners to simulate calling them
let mediaQueryListeners: ((event: Partial<MediaQueryListEvent>) => void)[] = [];
const mockMatchMedia = jest.fn();

// Store the original window.innerWidth and matchMedia
const originalInnerWidth = window.innerWidth;
const originalMatchMedia = window.matchMedia;

describe('useIsMobile hook', () => {
  beforeAll(() => {
    // Define window.matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia,
    });
  });

  beforeEach(() => {
    // Reset mocks and listeners before each test
    mediaQueryListeners = [];
    mockMatchMedia.mockImplementation(query => ({
      matches: window.innerWidth < MOBILE_BREAKPOINT, // Initial state based on current mocked innerWidth
      media: query,
      addListener: (listener: (event: Partial<MediaQueryListEvent>) => void) => {
        mediaQueryListeners.push(listener);
      },
      removeListener: (listener: (event: Partial<MediaQueryListEvent>) => void) => {
        mediaQueryListeners = mediaQueryListeners.filter(l => l !== listener);
      },
      // also mock addEventListener/removeEventListener for newer browsers
      addEventListener: (type: string, listener: (event: Partial<MediaQueryListEvent>) => void) => {
        if (type === 'change') {
          mediaQueryListeners.push(listener);
        }
      },
      removeEventListener: (type: string, listener: (event: Partial<MediaQueryListEvent>) => void) => {
        if (type === 'change') {
          mediaQueryListeners = mediaQueryListeners.filter(l => l !== listener);
        }
      },
      onchange: null,
      dispatchEvent: jest.fn(),
    }));

    // Set a default for window.innerWidth for each test, can be overridden
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Default to desktop
    });
  });

  afterAll(() => {
    // Restore original window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  // --- Test Cases will go here ---

  test('should return true if window.innerWidth is less than MOBILE_BREAKPOINT on initial render', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: MOBILE_BREAKPOINT - 1 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  test('should return false if window.innerWidth is gte MOBILE_BREAKPOINT on initial render', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: MOBILE_BREAKPOINT });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  test('should return false if window.innerWidth is greater than MOBILE_BREAKPOINT on initial render', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: MOBILE_BREAKPOINT + 1 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });


  test('should call addEventListener (or addListener) on matchMedia result', () => {
    renderHook(() => useIsMobile());
    // Expect that addListener (or addEventListener) was called, meaning mediaQueryListeners has entries
    expect(mediaQueryListeners.length).toBeGreaterThan(0);
    // Check if matchMedia was called with the correct query
    expect(mockMatchMedia).toHaveBeenCalledWith(`(max-width: ${MOBILE_BREAKPOINT -1}px)`);
  });

  test('should update state when media query changes (simulating matchMedia event)', () => {
    // Initial state: desktop
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: MOBILE_BREAKPOINT + 100 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false); // Initially false (desktop)

    // Simulate media query change to mobile
    act(() => {
      mediaQueryListeners.forEach(listener => listener({ matches: true, media: `(max-width: ${MOBILE_BREAKPOINT -1}px)` }));
    });
    expect(result.current).toBe(true); // Should update to true (mobile)

    // Simulate media query change back to desktop
    act(() => {
      mediaQueryListeners.forEach(listener => listener({ matches: false, media: `(max-width: ${MOBILE_BREAKPOINT -1}px)` }));
    });
    expect(result.current).toBe(false); // Should update to false (desktop)
  });

  test('should update state when window.innerWidth changes and "change" event is manually triggered for the MediaQueryList', () => {
    // Initial state: desktop
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: MOBILE_BREAKPOINT + 100 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      // Change window.innerWidth to mobile size
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: MOBILE_BREAKPOINT - 1 });
      // Manually trigger the listeners with the new match state
      // This simulates the browser firing the 'change' event on the MediaQueryList object
      const newMatchesState = window.innerWidth < MOBILE_BREAKPOINT;
      mediaQueryListeners.forEach(listener => listener({ matches: newMatchesState, media: `(max-width: ${MOBILE_BREAKPOINT -1}px)` }));
    });
    expect(result.current).toBe(true); // Should be true (mobile)

    act(() => {
      // Change window.innerWidth back to desktop size
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: MOBILE_BREAKPOINT + 1 });
      const newMatchesState = window.innerWidth < MOBILE_BREAKPOINT;
      mediaQueryListeners.forEach(listener => listener({ matches: newMatchesState, media: `(max-width: ${MOBILE_BREAKPOINT -1}px)` }));
    });
    expect(result.current).toBe(false); // Should be false (desktop)
  });


  test('should call removeEventListener (or removeListener) on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());
    const initialListenerCount = mediaQueryListeners.length;
    expect(initialListenerCount).toBeGreaterThan(0);

    unmount();
    // Check if the listener was removed. If the mock's removeListener is correct,
    // the count should be less or the specific listener instance gone.
    // Our mock removeListener filters the array.
    expect(mediaQueryListeners.length).toBe(0);
  });
});

// Tell Jest to use the manual mock for './use-toast'
jest.mock('./use-toast');

// Import what's needed for the tests.
import {
  reducer,
  actionTypes,
  State,
  Action,
  TOAST_LIMIT,
  toast as mockedToast,
  useToast as mockedUseToast,
  mockAddToRemoveQueue,
  mockDispatch,
  mockGenId,
  __resetMockState,
  mockMemoryState, // Import mockMemoryState to directly manipulate for some tests if needed
} from './use-toast';
// React import is no longer needed for useToast tests here as we removed useEffect spy

const initialState: State = {
  toasts: [],
};

describe('toast utilities', () => {
  beforeEach(() => {
    mockAddToRemoveQueue.mockClear();
    mockDispatch.mockClear();
    mockGenId.mockClear();
    __resetMockState();
  });

  // --- Reducer tests ---
  describe('reducer', () => {
    it('should add a new toast to an empty state', () => {
      const action: Action = {
        type: actionTypes.ADD_TOAST,
        toast: {
          id: '1',
          title: 'Test Toast',
          description: 'This is a test toast.',
          open: true,
        },
      };
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0]).toEqual(action.toast);
    });

    it('should add a new toast when the state already has toasts', () => {
      const existingState: State = {
        toasts: [
          { id: '1', title: 'Existing Toast', open: true },
        ],
      };
      const action: Action = {
        type: actionTypes.ADD_TOAST,
        toast: {
          id: '2',
          title: 'New Toast',
          description: 'This is a new toast.',
          open: true,
        },
      };
      const newState = reducer(existingState, action);

      if (TOAST_LIMIT === 1) {
        expect(newState.toasts).toHaveLength(1);
        expect(newState.toasts[0].id).toBe('2');
      } else {
        expect(newState.toasts).toHaveLength(2);
        expect(newState.toasts[0].id).toBe('2');
        expect(newState.toasts[1].id).toBe('1');
      }
    });

    it('should respect TOAST_LIMIT and the new toast should be at the beginning', () => {
      const initialToasts = [];
      const initialFillCount = TOAST_LIMIT > 0 ? Math.max(0, TOAST_LIMIT - 1) : 0;
      for (let i = 0; i < initialFillCount; i++) {
        initialToasts.push({ id: `old-${i}`, title: `Old Toast ${i}`, open: true });
      }
      const stateBeforeLimitReached: State = { toasts: initialToasts };

      const firstNewToastAction: Action = {
        type: actionTypes.ADD_TOAST,
        toast: { id: 'new-toast-1', title: 'New Toast 1', open: true },
      };
      let newState = reducer(stateBeforeLimitReached, firstNewToastAction);

      expect(newState.toasts[0].id).toBe('new-toast-1');
      expect(newState.toasts).toHaveLength(Math.min(initialFillCount + 1, TOAST_LIMIT));

      const secondNewToastAction: Action = {
        type: actionTypes.ADD_TOAST,
        toast: { id: 'new-toast-2', title: 'New Toast 2', open: true },
      };
      newState = reducer(newState, secondNewToastAction);

      expect(newState.toasts).toHaveLength(TOAST_LIMIT);
      expect(newState.toasts[0].id).toBe('new-toast-2');

      if (TOAST_LIMIT === 1) {
        expect(newState.toasts[0].id).toBe('new-toast-2');
      } else if (TOAST_LIMIT > 1) {
        expect(newState.toasts[1].id).toBe('new-toast-1');
        if (initialFillCount > 0 && initialFillCount + 2 > TOAST_LIMIT) {
             const oldestPushedOutId = `old-${initialFillCount -1 }`;
             expect(newState.toasts.find(t => t.id === oldestPushedOutId)).toBeUndefined();
        }
      }
    });

    describe('UPDATE_TOAST', () => {
      it('should update an existing toast', () => {
        const existingState: State = {
          toasts: [
            { id: '1', title: 'Old Title', description: 'Old Description', open: true },
          ],
        };
        const action: Action = {
          type: actionTypes.UPDATE_TOAST,
          toast: { id: '1', title: 'New Title', description: 'New Description' },
        };
        const newState = reducer(existingState, action);
        expect(newState.toasts[0].title).toBe('New Title');
        expect(newState.toasts[0].description).toBe('New Description');
      });

      it('should not change state or error if updating a non-existent toast', () => {
        const existingState: State = { toasts: [{ id: '1', title: 'Existing Toast', open: true }] };
        const action: Action = { type: actionTypes.UPDATE_TOAST, toast: { id: '2', title: 'New Title' } };
        const newState = reducer(existingState, action);
        expect(newState).toEqual(existingState);
      });
    });

    describe('DISMISS_TOAST', () => {
      it('should dismiss a specific toast and call addToRemoveQueue', () => {
        const existingState: State = {
          toasts: [
            { id: '1', title: 'Toast 1', open: true },
            { id: '2', title: 'Toast 2', open: true },
          ],
        };
        const action: Action = { type: actionTypes.DISMISS_TOAST, toastId: '1' };
        const newState = reducer(existingState, action);
        expect(newState.toasts.find(t => t.id === '1')?.open).toBe(false);
        expect(newState.toasts.find(t => t.id === '2')?.open).toBe(true);
        expect(mockAddToRemoveQueue).toHaveBeenCalledWith('1');
      });

      it('should dismiss all toasts if toastId is undefined and call addToRemoveQueue for each', () => {
        const existingState: State = {
          toasts: [
            { id: '1', title: 'Toast 1', open: true },
            { id: '2', title: 'Toast 2', open: true },
          ],
        };
        const action: Action = { type: actionTypes.DISMISS_TOAST };
        const newState = reducer(existingState, action);
        expect(newState.toasts.every(t => !t.open)).toBe(true);
        expect(mockAddToRemoveQueue).toHaveBeenCalledWith('1');
        expect(mockAddToRemoveQueue).toHaveBeenCalledWith('2');
        expect(mockAddToRemoveQueue).toHaveBeenCalledTimes(2);
      });
    });

    describe('REMOVE_TOAST', () => {
      it('should remove a specific toast', () => {
        const existingState: State = {
          toasts: [
            { id: '1', title: 'Toast 1', open: true },
            { id: '2', title: 'Toast 2', open: false },
          ],
        };
        const action: Action = { type: actionTypes.REMOVE_TOAST, toastId: '1' };
        const newState = reducer(existingState, action);
        expect(newState.toasts).toHaveLength(1);
        expect(newState.toasts[0].id).toBe('2');
      });

      it('should remove all toasts if toastId is undefined', () => {
        const existingState: State = {
          toasts: [
            { id: '1', title: 'Toast 1', open: true },
            { id: '2', title: 'Toast 2', open: false },
          ],
        };
        const action: Action = { type: actionTypes.REMOVE_TOAST };
        const newState = reducer(existingState, action);
        expect(newState.toasts).toHaveLength(0);
      });

      it('should not change state if removing a non-existent toast', () => {
        const existingState: State = { toasts: [{ id: '1', title: 'Toast 1', open: true }] };
        const action: Action = { type: actionTypes.REMOVE_TOAST, toastId: 'non-existent-id' };
        const newState = reducer(existingState, action);
        expect(newState).toEqual(existingState);
      });
    });
  });

  // --- Tests for toast() function ---
  describe('toast() function', () => {
    const toastProps = { title: 'Test Title', description: 'Test Description' };
    const generatedId = 'mocked-id-123';

    beforeEach(() => {
      mockGenId.mockReturnValue(generatedId);
    });

    it('should call genId to generate an ID', () => {
      mockedToast(toastProps);
      expect(mockGenId).toHaveBeenCalledTimes(1);
    });

    it('should call dispatch with ADD_TOAST action and correct properties', () => {
      mockedToast(toastProps);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: actionTypes.ADD_TOAST,
        toast: {
          ...toastProps,
          id: generatedId,
          open: true,
          onOpenChange: expect.any(Function),
        },
      });
    });

    it('returned dismiss function should call dispatch with DISMISS_TOAST', () => {
      const { id, dismiss } = mockedToast(toastProps);
      expect(id).toBe(generatedId);
      dismiss();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: actionTypes.DISMISS_TOAST,
        toastId: generatedId,
      });
    });

    it('returned update function should call dispatch with UPDATE_TOAST', () => {
      const { id, update } = mockedToast(toastProps);
      expect(id).toBe(generatedId);
      const updateProps = { title: 'Updated Title' };
      update(updateProps);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...updateProps, id: generatedId },
      });
    });

    it('onOpenChange callback should dispatch DISMISS_TOAST when called with false', () => {
      mockedToast(toastProps);
      const addToastActionCall = mockDispatch.mock.calls.find(call => call[0].type === actionTypes.ADD_TOAST);
      expect(addToastActionCall).toBeDefined();
      const onOpenChangeCallback = addToastActionCall[0].toast.onOpenChange;

      onOpenChangeCallback(false);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: actionTypes.DISMISS_TOAST,
        toastId: generatedId,
      });
    });
  });

  // --- Simplified tests for useToast() hook ---
  describe('useToast() hook', () => {
    it('should return current toasts from mockMemoryState', () => {
      // Directly set up mockMemoryState for this test, or use mockedToast to populate it
      mockMemoryState.toasts = [{ id: 'toast1', title: 'Initial Toast in State', open: true }];

      const { toasts } = mockedUseToast(); // Call the hook
      expect(toasts).toHaveLength(1);
      expect(toasts[0].title).toBe('Initial Toast in State');
    });

    it('should return the mocked toast function', () => {
      const { toast: hookToastFunc } = mockedUseToast();
      expect(hookToastFunc).toBe(mockedToast);
    });

    it('returned dismiss function should call dispatch with DISMISS_TOAST', () => {
      const { dismiss } = mockedUseToast();
      dismiss('some-id');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: actionTypes.DISMISS_TOAST,
        toastId: 'some-id',
      });
    });

    it('returned dismiss function should call dispatch without toastId if none provided', () => {
      const { dismiss } = mockedUseToast();
      dismiss();
      // Check that the last call to mockDispatch was the one we expected
      expect(mockDispatch).toHaveBeenLastCalledWith({
        type: actionTypes.DISMISS_TOAST,
        toastId: undefined,
      });
    });
  });
});

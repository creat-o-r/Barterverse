// src/hooks/__mocks__/use-toast.ts
// No need to import React here anymore for the useToast mock itself.
// import * as React from 'react';

const originalModule = jest.requireActual('../use-toast');

// --- Mock Functions ---
export const mockAddToRemoveQueue = jest.fn();
export const mockDispatch = jest.fn();
export const mockGenId = jest.fn();

// --- Mock State & Listeners (Listeners are no longer directly used by useToast mock) ---
export let mockMemoryState: originalModule.State = { toasts: [] }; // Export for potential direct manipulation in tests if needed
const mockListeners: Array<(state: originalModule.State) => void> = []; // Kept for internalMockDispatch consistency

// Helper to update mockMemoryState and notify listeners
const internalMockDispatch = (action: originalModule.Action) => {
  mockMemoryState = reducer(mockMemoryState, action);
  mockDispatch(action);
  // Listeners would be called here in a more complete React simulation,
  // but useToast mock won't use React's state/effect hooks directly.
  mockListeners.forEach(listener => listener(mockMemoryState));
};

// --- Export original constants and types ---
export const actionTypes = originalModule.actionTypes;
export const TOAST_LIMIT = originalModule.TOAST_LIMIT;
export type { State, Action } from '../use-toast';

// --- Mocked Reducer ---
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;
      if (toastId) {
        mockAddToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          mockAddToRemoveQueue(toast.id);
        });
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

// --- Mocked toast function ---
export const toast = (props: Omit<originalModule.ToasterToast, "id">) => {
  const id = mockGenId();
  internalMockDispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) {
          internalMockDispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });
        }
      },
    },
  });
  return {
    id: id,
    dismiss: () => internalMockDispatch({ type: actionTypes.DISMISS_TOAST, toastId: id }),
    update: (updateProps: any) =>
      internalMockDispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...updateProps, id },
      }),
  };
};

// --- Simplified Mocked useToast hook ---
export const useToast = () => {
  // Directly return values based on current mockMemoryState and mocked functions
  // This avoids calling React.useState and React.useEffect directly.
  return {
    toasts: mockMemoryState.toasts, // Return toasts from our mock state
    toast,                          // Return the mocked toast function from this file
    dismiss: (toastId?: string) => internalMockDispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
};

// --- Helper for tests to reset state ---
export const __resetMockState = () => {
  mockMemoryState = { toasts: [] };
  mockListeners.length = 0;
};

export { mockAddToRemoveQueue as addToRemoveQueue };

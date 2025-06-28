"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup, // Added for social providers
  FacebookAuthProvider, // Added Facebook provider
  TwitterAuthProvider,  // Added Twitter provider
  OAuthProvider // Generic OAuth provider, useful for others if needed
} from 'firebase/auth';
import { auth as firebaseAuthInstance } from '@/lib/firebase/firebaseConfig'; // Named import
import { getUser, addUser, updateUser } from '@/lib/firebase/firestoreUtils'; // To sync/update user profile
import type { User as AppUser } from '@/types'; // Your app's User type

interface AuthContextType {
  currentUser: FirebaseUser | null; // Firebase Auth user object
  appUser: AppUser | null; // Your application's user profile from Firestore
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string, name: string, avatarUrl?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseAuthInstance) {
      console.warn("Firebase Auth is not initialized. AuthProvider will not function.");
      setIsLoading(false);
      // Optionally set an error state here
      setError("Firebase Auth not available. Check Firebase configuration and environment variables.");
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Fetch or create app-specific user profile from Firestore
          let profile = await getUser(user.uid);
          if (!profile) {
            // This case might happen if user was created via Firebase console directly
            // or if Firestore profile creation failed during signup.
            // For now, we'll create a basic profile if it doesn't exist.
            // A more robust solution might require more fields or redirect to a profile setup page.
            console.log(`No Firestore profile for user ${user.uid}, creating basic one.`);
            const basicProfile: AppUser = {
              id: user.uid,
              name: user.displayName || user.email || 'New User',
              email: user.email || '', // Firebase User type has email as string | null
              avatarUrl: user.photoURL || `https://avatar.vercel.sh/${user.uid}.png`, // Default Vercel avatar
              rating: 0, // Default rating
              tradesCompleted: 0,
              items: [], // Initially no items
              // Initialize other UserProfilePreferences fields with defaults
              motivations: [],
              locationPreference: { isSensitive: false },
              tradeTimingPreference: 'flexible',
              interestedInThirdPartyFulfillment: false,
              minimumMatchRating: 'Low',
              logisticsPreferences: { defaultDeliveryMethods: ['pickup_only'], openToChainDelivery: false },
              locations: [{id: 'default_home', name: 'Home', isDefault: true}], // Basic default location
            };
            await addUser(basicProfile); // Ensure addUser can handle potentially missing fields or provide defaults
            profile = basicProfile;
          }
          setAppUser(profile);
        } catch (e) {
          console.error("Error fetching/creating app user profile:", e);
          setError("Failed to load user profile data.");
          setAppUser(null); // Ensure appUser is cleared on error
        }
      } else {
        setAppUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, avatarUrl?: string) => {
    if (!firebaseAuthInstance) throw new Error("Firebase Auth not initialized.");
    setError(null);
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, email, password);
      const firebaseUser = userCredential.user;
      // Create corresponding user profile in Firestore
      const newUserProfile: AppUser = {
        id: firebaseUser.uid,
        name: name,
        email: firebaseUser.email || '',
        avatarUrl: avatarUrl || `https://avatar.vercel.sh/${firebaseUser.uid}.png`,
        rating: 0,
        tradesCompleted: 0,
        items: [],
        motivations: [],
        locationPreference: { isSensitive: false },
        tradeTimingPreference: 'flexible',
        interestedInThirdPartyFulfillment: false,
        minimumMatchRating: 'Low',
        logisticsPreferences: { defaultDeliveryMethods: ['pickup_only'], openToChainDelivery: false },
        locations: [{id: 'default_home', name: 'Home', isDefault: true}],
      };
      await addUser(newUserProfile);
      setAppUser(newUserProfile); // Optimistically update appUser state
      // currentUser will be updated by onAuthStateChanged
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!firebaseAuthInstance) throw new Error("Firebase Auth not initialized.");
    setError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuthInstance, email, password);
      // currentUser and appUser will be updated by onAuthStateChanged
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    if (!firebaseAuthInstance) throw new Error("Firebase Auth not initialized.");
    setError(null);
    try {
      await firebaseSignOut(firebaseAuthInstance);
      // currentUser and appUser will be cleared by onAuthStateChanged
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  // Ensure firebaseAuthInstance is checked before creating context value
  const value = firebaseAuthInstance ? {
    currentUser,
    appUser,
    isLoading,
    error,
    signUp,
    signIn,
    signOut,
  } : { // Provide a fallback value if auth is not initialized
    currentUser: null,
    appUser: null,
    isLoading: false, // Not loading if auth isn't even set up
    error: "Firebase Auth not initialized. Check Firebase configuration.",
    signUp: async () => { throw new Error("Auth not initialized"); },
    signIn: async () => { throw new Error("Auth not initialized"); },
    signOut: async () => { throw new Error("Auth not initialized"); },
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

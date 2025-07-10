'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig'; // Using the initialized auth from firebaseConfig

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
  User as FirebaseUser // Renaming to avoid conflict with our AppUserType
} from 'firebase/auth';
import { createUserProfileDocument, getUserProfile } from '@/services/userService'; // Import userService functions
import type { User as AppUserType } from '@/types'; // Our application's User type

interface AuthContextType {
  currentUser: FirebaseUser | null; // Firebase Auth User
  userProfile: AppUserType | null; // Firestore User Profile
  loading: boolean; // Combined loading state for auth and profile
  error: AuthError | Error | null;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUserProfile: () => Promise<void>; // Function to manually reload profile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserType | null>(null);
  const [loading, setLoading] = useState(true); // True initially for auth state check
  const [error, setError] = useState<AuthError | Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (fbUser: FirebaseUser | null) => {
        console.log('[AuthContext] onAuthStateChanged triggered. User:', fbUser?.uid || 'null');
        setCurrentUser(fbUser);
        if (fbUser) {
          setLoading(true);
          console.log(`[AuthContext] User ${fbUser.uid} authenticated. Fetching profile...`);
          try {
            const profile = await getUserProfile(fbUser.uid);
            setUserProfile(profile);
            console.log(`[AuthContext] Profile for ${fbUser.uid} fetched:`, profile ? 'found' : 'not found/created yet');
            if (!profile) {
              console.warn(`[AuthContext] No Firestore profile found for user ${fbUser.uid}. This might be a new signup or data issue.`);
            }
            setError(null);
          } catch (profileError: any) {
            console.error('[AuthContext] Error fetching user profile:', profileError.message, profileError.stack);
            setError(profileError);
            setUserProfile(null);
          } finally {
            setLoading(false);
          }
        } else {
          console.log('[AuthContext] No Firebase user. Clearing profile.');
          setUserProfile(null);
          setLoading(false);
        }
      },
      (err) => {
        console.error('[AuthContext] Critical Auth state change error:', err.message, err.stack);
        setError(err);
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);


  const reloadUserProfile = async () => {
    if (currentUser) {
      setLoading(true);
      try {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
        setError(null);
      } catch (profileError: any) {
        console.error('Error reloading user profile:', profileError);
        setError(profileError);
      } finally {
        setLoading(false);
      }
    }
  };

  const logout = async () => {
    console.log('[AuthContext] Attempting to sign out...');
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null); // Also clear userProfile on logout
      setError(null);
      console.log('[AuthContext] Sign out successful.');
    } catch (err: any) {
      console.error('[AuthContext] Error signing out:', err.message, err.stack);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    console.log(`[AuthContext] Attempting to sign up user: ${email}`);
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log(`[AuthContext] Firebase Auth user created: ${userCredential.user.uid}`);
      if (userCredential.user) {
        await createUserProfileDocument(userCredential.user);
        console.log(`[AuthContext] Firestore profile document potentially created for ${userCredential.user.uid}. onAuthStateChanged will handle profile loading.`);
      } else {
        // This case should ideally not happen if createUserWithEmailAndPassword succeeds
        console.error("[AuthContext] User creation in Firebase Auth succeeded but no user object returned.");
        throw new Error("User creation in Firebase Auth succeeded but no user object returned.");
      }
      // onAuthStateChanged handles setting currentUser and userProfile
    } catch (err: any) {
      console.error(`[AuthContext] Error signing up ${email}:`, err.message, err.stack, err.code);
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log(`[AuthContext] Attempting to sign in user: ${email}`);
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log(`[AuthContext] Sign in successful for ${email}. onAuthStateChanged will handle profile loading.`);
      // onAuthStateChanged handles setting currentUser and userProfile
    } catch (err: any) {
      console.error(`[AuthContext] Error signing in ${email}:`, err.message, err.stack, err.code);
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Consolidate all context values into a single object
  const contextValue = {
    currentUser,
    userProfile,
    loading,
    error,
    logout,
    signUpWithEmail,
    signInWithEmail,
    reloadUserProfile,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

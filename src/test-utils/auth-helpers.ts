// Test utilities for Firebase Auth emulator
import { auth } from '@/lib/firebase/firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  User 
} from 'firebase/auth';

export const testAuthHelpers = {
  // Create and sign in a new test user
  async createAndSignInTestUser(email: string, password: string = 'testpass123'): Promise<User> {
    if (!auth) throw new Error('Firebase Auth not initialized');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      // If user already exists, try to sign them in
      if (error.code === 'auth/email-already-in-use') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
      }
      throw error;
    }
  },

  // Sign in existing test user
  async signInTestUser(email: string, password: string = 'testpass123'): Promise<User> {
    if (!auth) throw new Error('Firebase Auth not initialized');
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // Sign out current user
  async signOutTestUser(): Promise<void> {
    if (!auth) throw new Error('Firebase Auth not initialized');
    await signOut(auth);
  },

  // Create multiple test users for complex scenarios
  async createTestUsers(count: number): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      const email = `testuser${i}@example.com`;
      const user = await this.createAndSignInTestUser(email);
      users.push(user);
      await this.signOutTestUser(); // Sign out after each creation
    }
    return users;
  },

  // Wait for auth state to settle
  async waitForAuthState(): Promise<void> {
    return new Promise((resolve) => {
      if (!auth) {
        resolve();
        return;
      }
      
      const unsubscribe = auth.onAuthStateChanged(() => {
        unsubscribe();
        // Give more time for React state to update
        setTimeout(resolve, 500);
      });
    });
  }
};
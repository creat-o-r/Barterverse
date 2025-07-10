'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // For loading state

interface PrivateRouteProps {
  children: ReactNode;
  redirectTo?: string; // Optional: where to redirect if not authenticated
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, redirectTo = '/auth/signin' }) => {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-var(--navbar-height,10rem))]"> {/* Adjust min-h as needed */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2 font-body">Loading user session...</p>
      </div>
    );
  }

  if (!currentUser) {
    // User is not authenticated, redirect to sign-in page
    // It's important to do this in a useEffect or after initial render for client-side components
    // to avoid issues with Next.js static generation or server components.
    // However, since this is a client component checking client-side auth state,
    // immediate redirection logic is common.
    // For Next.js App Router, ensure this runs client-side.
    if (typeof window !== 'undefined') { // Ensure this only runs on the client
        router.push(redirectTo);
    }
    return ( // Render a loading/redirecting state or null while redirecting
        <div className="flex items-center justify-center min-h-[calc(100vh-var(--navbar-height,10rem))]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-2 font-body">Redirecting to sign in...</p>
        </div>
    );
  }

  // User is authenticated, render the children
  return <>{children}</>;
};

export default PrivateRoute;

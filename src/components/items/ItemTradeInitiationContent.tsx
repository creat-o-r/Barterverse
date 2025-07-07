"use client";

import { Button } from '@/components/ui/button';
import { MessageSquare, LogIn } from 'lucide-react'; // Added LogIn
import type { Item } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { usePathname } from 'next/navigation'; // To get current path for redirect

interface ItemTradeInitiationContentProps {
  item: Item;
  ownerName: string;
  ownerId: string;
}

export default function ItemTradeInitiationContent({ item, ownerName, ownerId }: ItemTradeInitiationContentProps) {
  const { currentUser: firebaseUser, isLoading: authIsLoading } = useAuth();
  const pathname = usePathname();

  if (authIsLoading) {
    return (
      <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg" disabled>
        <MessageSquare className="mr-2 h-5 w-5" />
        Loading...
      </Button>
    );
  }

  if (!firebaseUser) {
    return (
      <>
        <p className="text-sm font-body text-muted-foreground mb-4">
          Want to trade for "{item.name}"? Sign in to start a conversation with {ownerName}.
        </p>
        <Button asChild className="w-full" size="lg">
          <Link href={`/auth/signin?redirect=${encodeURIComponent(pathname)}`}>
            <LogIn className="mr-2 h-5 w-5" />
            Sign In to Negotiate
          </Link>
        </Button>
      </>
    );
  }

  // User is logged in
  const currentUserId = firebaseUser.uid;
  
  // Construct a tradeId.
  const tradeId = `trade-${currentUserId}-wants-${item.id}-from-${ownerId}`;

  return (
    <>
      <p className="text-sm font-body text-muted-foreground mb-4">
        Start a conversation with {ownerName} to negotiate a trade for "{item.name}".
      </p>
      <Button
        asChild
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        size="lg"
      >
        <Link href={`/trades/${tradeId}`}>
          <MessageSquare className="mr-2 h-5 w-5" />
          Open Negotiation Chat
        </Link>
      </Button>
    </>
  );
}
